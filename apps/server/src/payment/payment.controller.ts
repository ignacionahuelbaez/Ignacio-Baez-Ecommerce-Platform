import { Body, Controller, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';

import { PaymentService } from '@payment/payment.service';
import { JwtAuthGuard } from '@auth/auth.guard';
import { CurrentUser } from '@user/user.decorator';

@Controller()
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post('orders/:id/payment-preference')
  @UseGuards(JwtAuthGuard)
  async createPreference(
    @CurrentUser() user: any,
    @Param('id') orderId: string,
  ): Promise<{ preferenceId: string; initPoint: string }> {
    return await this.paymentService.createPreference(user.id, orderId);
  }

  // Public endpoint: Mercado Pago calls this directly, it can't send our JWT.
  @Post('payments/webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(@Body() body: any, @Query() query: Record<string, any>): Promise<{ received: true }> {
    await this.paymentService.handleWebhook(body, query);
    return { received: true };
  }
}
