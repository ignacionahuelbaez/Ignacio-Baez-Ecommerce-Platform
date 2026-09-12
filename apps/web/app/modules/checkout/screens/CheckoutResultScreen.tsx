"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Container,
  Card,
  Heading,
  Text,
  Button,
  Skeleton,
} from "@react-shop/design-system";
import { useOrder, useCreatePaymentPreference, OrderStatus } from "@react-shop/sdk";
import { OrderConfirmation } from "../components";

// Mercado Pago (Checkout Pro) redirects here after the hosted payment flow.
// The `status` query param reflects MP's own redirect intent, but the order's real
// status — updated by the webhook, which may land slightly after this page loads —
// is the source of truth for what we actually show.
export function CheckoutResultScreen() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const mpStatus = searchParams.get("status");

  const { data: order, isLoading } = useOrder(orderId ?? "");
  const { mutate: retryPayment, isPending: retrying } = useCreatePaymentPreference();

  if (!orderId) {
    return (
      <Container maxWidth="sm" className="py-16 text-center">
        <Card padding="lg">
          <Text color="secondary">Missing order reference.</Text>
        </Card>
      </Container>
    );
  }

  if (isLoading || !order) {
    return (
      <Container maxWidth="sm" className="py-16">
        <Skeleton variant="rectangular" className="h-64 rounded-xl" />
      </Container>
    );
  }

  const isPaid = [
    OrderStatus.PAID,
    OrderStatus.PROCESSING,
    OrderStatus.SHIPPED,
    OrderStatus.DELIVERED,
  ].includes(order.status);
  const isPending = order.status === OrderStatus.PAYMENT_PENDING || mpStatus === "pending";

  if (isPaid) {
    return (
      <Container maxWidth="sm" className="py-16">
        <Card padding="lg">
          <OrderConfirmation order={order} />
        </Card>
      </Container>
    );
  }

  if (isPending) {
    return (
      <Container maxWidth="sm" className="py-16 text-center">
        <Card padding="lg">
          <Heading as="h2" size="2xl" className="mb-2">
            Payment pending
          </Heading>
          <Text color="secondary" className="mb-6">
            We're waiting for Mercado Pago to confirm your payment (this can take a
            little longer for bank transfers or cash payment methods). We'll update
            your order automatically — you can check its status from your order
            history at any time.
          </Text>
          <Link href="/account/orders">
            <Button variant="solid" size="lg">
              View Order Status
            </Button>
          </Link>
        </Card>
      </Container>
    );
  }

  // Order still PENDING: payment was not completed (rejected/cancelled/abandoned).
  return (
    <Container maxWidth="sm" className="py-16 text-center">
      <Card padding="lg">
        <Heading as="h2" size="2xl" className="mb-2">
          Payment not completed
        </Heading>
        <Text color="secondary" className="mb-6">
          Your order #{order.orderNumber} is saved, but the payment wasn't completed.
          You can try again.
        </Text>
        <Button
          variant="solid"
          size="lg"
          disabled={retrying}
          onClick={() =>
            retryPayment(order.id, {
              onSuccess: (preference) => {
                window.location.href = preference.initPoint;
              },
            })
          }
        >
          {retrying ? "Redirecting..." : "Try Payment Again"}
        </Button>
      </Card>
    </Container>
  );
}
