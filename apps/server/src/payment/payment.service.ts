import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { MercadoPagoConfig, Preference, Payment as MPPaymentApi } from 'mercadopago';
import { OrderStatus, PaymentStatus, PaymentMethod } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { OrderService } from '../order/order.service';

// Checkout Pro (redirect) integration: we never touch card data ourselves — Mercado Pago
// hosts the payment form, and calls our webhook to tell us what happened. That keeps this
// server out of PCI scope entirely, at the cost of a full-page redirect during checkout.
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private prisma: PrismaService,
    private orderService: OrderService,
  ) {}

  private getClient(): MercadoPagoConfig {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken) {
      throw new BadRequestException('Payments are not configured on this server yet');
    }

    return new MercadoPagoConfig({ accessToken });
  }

  async createPreference(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: { include: { product: true } } },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Order is not awaiting payment');
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3500';
    const apiUrl = process.env.API_BASE_URL || 'http://localhost:5001';
    const webhookUrl = process.env.MERCADOPAGO_WEBHOOK_URL || `${apiUrl}/api/payments/webhook`;
    const currency = process.env.MERCADOPAGO_CURRENCY || 'ARS';

    const preference = new Preference(this.getClient());
    const result = await preference.create({
      body: {
        items: order.items.map((item) => ({
          id: item.productId,
          title: item.product?.name ?? 'Product',
          quantity: item.quantity,
          unit_price: item.price,
          currency_id: currency,
        })),
        external_reference: order.id,
        back_urls: {
          success: `${frontendUrl}/checkout/result?orderId=${order.id}&status=success`,
          failure: `${frontendUrl}/checkout/result?orderId=${order.id}&status=failure`,
          pending: `${frontendUrl}/checkout/result?orderId=${order.id}&status=pending`,
        },
        auto_return: 'approved',
        notification_url: webhookUrl,
      },
    });

    await this.prisma.payment.create({
      data: {
        orderId: order.id,
        userId,
        amount: order.total,
        currency,
        status: PaymentStatus.PENDING,
        method: PaymentMethod.MERCADO_PAGO,
        gatewayResponse: { preferenceId: result.id, initPoint: result.init_point },
      },
    });

    return { preferenceId: result.id, initPoint: result.init_point };
  }

  // Mercado Pago's webhook body only tells us a payment id changed — we always re-fetch
  // the payment from MP's API by that id before trusting anything, so a forged webhook
  // call can't just claim "approved" for an order it doesn't control.
  // NOTE: this does not yet verify MP's `x-signature` header (HMAC of the notification) —
  // acceptable for now since the re-fetch-by-id step already blocks the obvious forgery,
  // but signature verification should be added (see docs/payments-mercadopago.md) before
  // relying on this for a live store with real money at stake.
  async handleWebhook(body: any, query: Record<string, any>) {
    const paymentId = body?.data?.id || query?.['data.id'] || query?.id;
    const type = body?.type || query?.type;

    if (type && type !== 'payment') {
      return; // Ignore merchant_order / other notification types we don't act on.
    }

    if (!paymentId) {
      this.logger.warn(`Webhook received with no payment id: ${JSON.stringify({ body, query })}`);
      return;
    }

    const mpPayment = await new MPPaymentApi(this.getClient()).get({ id: paymentId });
    const orderId = mpPayment.external_reference;

    if (!orderId) {
      this.logger.warn(`MP payment ${paymentId} has no external_reference (order id)`);
      return;
    }

    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      this.logger.warn(`MP payment ${paymentId} references unknown order ${orderId}`);
      return;
    }

    const { paymentStatus, orderStatus } = this.mapMercadoPagoStatus(mpPayment.status);

    await this.prisma.payment.updateMany({
      where: { orderId, method: PaymentMethod.MERCADO_PAGO },
      data: {
        status: paymentStatus,
        transactionId: String(mpPayment.id),
        gatewayResponse: mpPayment as any,
      },
    });

    if (orderStatus && orderStatus !== order.status) {
      await this.orderService.updateOrderStatus(orderId, orderStatus);
    }
  }

  private mapMercadoPagoStatus(mpStatus?: string): {
    paymentStatus: PaymentStatus;
    orderStatus: OrderStatus | null;
  } {
    switch (mpStatus) {
      case 'approved':
        return { paymentStatus: PaymentStatus.COMPLETED, orderStatus: OrderStatus.PAID };
      case 'in_process':
      case 'pending':
        return { paymentStatus: PaymentStatus.PENDING, orderStatus: OrderStatus.PAYMENT_PENDING };
      case 'rejected':
      case 'cancelled':
        return { paymentStatus: PaymentStatus.FAILED, orderStatus: null };
      case 'refunded':
      case 'charged_back':
        return { paymentStatus: PaymentStatus.REFUNDED, orderStatus: OrderStatus.REFUNDED };
      default:
        return { paymentStatus: PaymentStatus.PENDING, orderStatus: null };
    }
  }
}
