"use client";

import { useRouter } from "next/navigation";
import { Container, Card, Heading, Text, Stack } from "@react-shop/design-system";
import { useRegister, useMergeGuestCart } from "@react-shop/sdk";
import { useGuestCart } from "../../../providers/GuestCartProvider";
import { RegisterForm, RegisterFormData } from "../components";

export function RegisterScreen() {
  const router = useRouter();
  const { mutate: register, isPending, error } = useRegister();
  const { items: guestItems, clear: clearGuestCart } = useGuestCart();
  const { mutate: mergeGuestCart } = useMergeGuestCart();

  const handleSubmit = (data: Omit<RegisterFormData, "confirmPassword">) => {
    register(data, {
      onSuccess: () => {
        if (guestItems.length > 0) {
          mergeGuestCart(
            guestItems.map(({ productId, variantId, quantity }) => ({
              productId,
              variantId,
              quantity,
            })),
            { onSuccess: () => clearGuestCart() },
          );
        }
        router.push("/");
      },
    });
  };

  return (
    <Container maxWidth="sm" className="py-16">
      <Card padding="lg">
        <Stack className="gap-6">
          <Stack className="gap-2">
            <Heading as="h1" size="3xl" className="text-center">
              Create Account
            </Heading>
            <Text size="md" color="secondary" align="center">
              Sign up to start shopping
            </Text>
          </Stack>

          {error && (
            <Card variant="outline" padding="sm" className="bg-red-50">
              <Text color="error" size="sm">
                {error instanceof Error
                  ? error.message
                  : "Registration failed. Please try again."}
              </Text>
            </Card>
          )}

          <RegisterForm onSubmit={handleSubmit} isLoading={isPending} />
        </Stack>
      </Card>
    </Container>
  );
}

