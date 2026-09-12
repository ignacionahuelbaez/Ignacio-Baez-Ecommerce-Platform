import { z } from "zod";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "must be a 6-digit hex color, e.g. #0284c7");

const brandingSchema = z.object({
  store: z.object({
    name: z.string().min(1),
    tagline: z.string().min(1),
    description: z.string().min(1),
    logoText: z.string().min(1),
    logoAbbrev: z.string().min(1),
    logoUrl: z.string().url().optional(),
  }),
  contact: z.object({
    email: z.string().email(),
    phone: z.string().optional(),
    address: z.string().optional(),
  }),
  locale: z.object({
    language: z.string().min(2),
    currency: z.string().length(3, "must be a 3-letter ISO currency code, e.g. USD"),
  }),
  shipping: z.object({
    freeShippingThreshold: z.number().nonnegative(),
    standardFee: z.number().nonnegative(),
    expressFee: z.number().nonnegative(),
    overnightFee: z.number().nonnegative(),
    standardDays: z.string().min(1),
    expressDays: z.string().min(1),
    overnightCutoff: z.string().min(1),
    internationalDays: z.string().min(1),
    processingCutoff: z.string().min(1),
  }),
  policies: z.object({
    returnWindowDays: z.number().int().nonnegative(),
    refundProcessingDays: z.string().min(1),
    refundCreditDays: z.string().min(1),
  }),
  social: z.object({
    facebook: z.string().url().optional(),
    twitter: z.string().url().optional(),
    instagram: z.string().url().optional(),
  }),
  features: z.object({
    newsletter: z.boolean(),
    reviews: z.boolean(),
    wishlist: z.boolean(),
    darkMode: z.boolean(),
  }),
  theme: z.object({
    primaryColor: hexColor,
    primaryColorDark: hexColor,
  }),
});

export type BrandingConfig = z.infer<typeof brandingSchema>;

// Fails fast (at build/start time, not at some random page render) if a client's
// branding.ts is missing a field or has the wrong shape — see docs/customization.md.
function validateBranding(config: unknown): BrandingConfig {
  const result = brandingSchema.safeParse(config);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");

    throw new Error(`Invalid branding config in apps/web/config/branding.ts:\n${details}`);
  }

  return result.data;
}

const rawBranding: BrandingConfig = {
  store: {
    name: "Berzerk",
    tagline: "Best Online Shopping Experience",
    description: "Shop the latest products at unbeatable prices.",
    logoText: "Berzerk",
    logoAbbrev: "BK",
  },
  contact: {
    email: "support@berzerk.com",
  },
  locale: {
    language: "en-US",
    currency: "USD",
  },
  shipping: {
    freeShippingThreshold: 50,
    standardFee: 4.99,
    expressFee: 9.99,
    overnightFee: 24.99,
    standardDays: "5–7 business days",
    expressDays: "2–3 business days",
    overnightCutoff: "1pm EST",
    internationalDays: "10–21 business days",
    processingCutoff: "2pm EST",
  },
  policies: {
    returnWindowDays: 30,
    refundProcessingDays: "3–5 business days",
    refundCreditDays: "5–10 business days",
  },
  social: {},
  features: {
    newsletter: true,
    reviews: true,
    wishlist: true,
    darkMode: true,
  },
  theme: {
    primaryColor: "#0284c7",
    primaryColorDark: "#4ea9d8",
  },
};

export const branding: BrandingConfig = validateBranding(rawBranding);
