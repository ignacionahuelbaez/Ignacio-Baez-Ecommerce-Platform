"use client";

import { useRouter } from "next/navigation";
import { Container, Card, Heading, Text, Stack } from "@react-shop/design-system";
import { useLogin, useMergeGuestCart } from "@react-shop/sdk";
import { useGuestCart } from "../../../providers/GuestCartProvider";
import { LoginForm, LoginFormData } from "../components";

export function LoginScreen() {
  const router = useRouter();
  const { mutate: login, isPending, error } = useLogin();
  const { items: guestItems, clear: clearGuestCart } = useGuestCart();
  const { mutate: mergeGuestCart } = useMergeGuestCart();

  const handleSubmit = (data: LoginFormData) => {
    login(data, {
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
              Welcome Back
            </Heading>
            <Text size="md" color="secondary" align="center">
              Sign in to your account to continue
            </Text>
          </Stack>

          {error && (
            <Card variant="outline" padding="sm" className="bg-red-50">
              <Text color="error" size="sm">
                {error instanceof Error
                  ? error.message
                  : "Login failed. Please try again."}
              </Text>
            </Card>
          )}

          <LoginForm onSubmit={handleSubmit} isLoading={isPending} />
        </Stack>
      </Card>
    </Container>
  );
}

