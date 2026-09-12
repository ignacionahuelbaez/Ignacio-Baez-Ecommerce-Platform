import { CheckoutResultScreen } from "@/app/modules/checkout/screens";

export const metadata = { title: "Payment Status" };

// Mercado Pago redirects here with query params (orderId, status) that must be read
// client-side — force-dynamic avoids Next.js's static-generation requirement for a
// Suspense boundary around useSearchParams.
export const dynamic = "force-dynamic";

export default function CheckoutResultPage() {
  return <CheckoutResultScreen />;
}
