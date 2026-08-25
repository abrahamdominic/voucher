import { z } from "zod";

/**
 * Normalises a Nigerian phone number to a canonical local format
 * (080X XXX XXXX -> 080XXXXXXXX). Accepts +234… / 234… / 0…
 */
export function normalizeNigerianPhone(input: string): string | null {
  const digits = input.replace(/[\s\-()+.]/g, "");
  let local = digits;
  if (local.startsWith("+234")) local = `0${local.slice(4)}`;
  else if (local.startsWith("234")) local = `0${local.slice(3)}`;
  if (!/^0[7-9][01]\d{8}$/.test(local)) return null;
  return local;
}

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .transform((val, ctx) => {
    const normalized = normalizeNigerianPhone(val);
    if (!normalized) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid Nigerian phone number, e.g. 080X XXX XXXX",
      });
      return z.NEVER;
    }
    return normalized;
  });

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email address is required")
  .max(254)
  .pipe(z.email("Enter a valid email address"));

export const checkoutSchema = z.object({
  planId: z.string().uuid("Invalid plan"),
  phone: phoneSchema,
  email: emailSchema,
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const lookupSchema = z.object({
  phone: phoneSchema,
  identifier: z.string().trim().min(1, "Email or order reference is required").max(200),
});

export const planSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  price: z.coerce.number().min(0, "Price must be at least ₦0").max(10_000_000),
  durationHours: z.coerce.number().int().min(1).max(24 * 365),
  dataAllowanceMb: z.coerce.number().int().min(0).max(10_000_000_000).optional(),
  speedMbps: z.string().trim().max(50).optional().or(z.literal("")),
  deviceLimit: z.coerce.number().int().min(1).max(100),
  isActive: z.boolean(),
  isPopular: z.boolean(),
  displayOrder: z.coerce.number().int().min(0).max(10_000),
});

export const importRowSchema = z.object({
  voucher_code: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{4,40}$/, "Invalid voucher code format"),
  plan_id: z.string().uuid("Unknown plan"),
});
