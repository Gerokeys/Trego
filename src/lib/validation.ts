import { z } from "zod";
import { normalizeKenyanPhone } from "./phone";
import { CATEGORY_VALUES } from "./categories";
import { COUNTIES } from "./kenya";
import { isValidImei } from "./imei";

const phoneField = z
  .string()
  .trim()
  .transform((val, ctx) => {
    const normalized = normalizeKenyanPhone(val);
    if (!normalized) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid Kenyan phone number, e.g. 0712345678",
      });
      return z.NEVER;
    }
    return normalized;
  });

export const registerSchema = z.object({
  phoneNumber: phoneField,
  displayName: z.string().trim().min(2, "Name is too short").max(80),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export const loginSchema = z.object({
  phoneNumber: phoneField,
  password: z.string().min(1, "Password is required"),
});

export const phoneNumberSchema = phoneField;

export const verificationCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the 6-digit code from the SMS.");

export const CONDITION_GRADES = ["LIKE_NEW", "GOOD", "FAIR", "FOR_PARTS"] as const;

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal("").transform(() => undefined));

export const listingSchema = z
  .object({
    category: z.enum(CATEGORY_VALUES),
    title: z.string().trim().min(3, "Title is too short").max(120),
    brand: z.string().trim().min(1, "Brand is required").max(40),
    model: z.string().trim().min(1, "Model is required").max(60),
    storageGb: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
    ramGb: z.coerce
      .number()
      .int()
      .positive()
      .max(1024)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    conditionGrade: z.enum(CONDITION_GRADES, "Choose a condition grade"),
    defectsDescription: z.string().trim().max(2000).default(""),
    imei: z
      .string()
      .trim()
      .regex(/^\d{15}$/, "IMEI must be exactly 15 digits")
      .refine(isValidImei, "That IMEI isn’t valid. Dial *#06# and copy it exactly.")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    priceMajorUnits: z.coerce.number().positive("Enter a price").max(10_000_000),
    county: z.enum(COUNTIES, "Choose the county the item is in"),
    area: optionalText(60),
    meetUp: z.boolean(),
    delivery: z.boolean(),
    acceptsOffers: z.boolean(),
  })
  .refine((data) => data.meetUp || data.delivery, {
    message: "Choose at least one handover option: meet up or delivery.",
  });

/** Reads the listing form's fields (checkboxes arrive as "on" or missing). */
export function listingFormValues(formData: FormData) {
  return {
    category: formData.get("category"),
    title: formData.get("title"),
    brand: formData.get("brand"),
    model: formData.get("model"),
    storageGb: formData.get("storageGb"),
    ramGb: formData.get("ramGb") ?? "",
    conditionGrade: formData.get("conditionGrade"),
    defectsDescription: formData.get("defectsDescription") ?? "",
    imei: formData.get("imei") ?? "",
    priceMajorUnits: formData.get("priceMajorUnits"),
    county: formData.get("county"),
    area: formData.get("area") ?? "",
    meetUp: formData.get("meetUp") === "on",
    delivery: formData.get("delivery") === "on",
    acceptsOffers: formData.get("acceptsOffers") === "on",
  };
}

export const messageSchema = z
  .string()
  .trim()
  .min(1, "Write a message first.")
  .max(2000, "Messages can be up to 2,000 characters.");

export const offerSchema = z.object({
  amountMajorUnits: z.coerce
    .number()
    .int("Offer a whole number of shillings.")
    .positive("Enter an offer amount."),
  message: z.string().trim().max(500).default(""),
});

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "Choose a rating from 1 to 5.").max(5),
  comment: z.string().trim().max(1000).default(""),
});

export const disputeReasonSchema = z
  .string()
  .trim()
  .min(10, "Describe what’s wrong (at least 10 characters).")
  .max(2000);

export const REPORT_REASONS = ["SCAM", "STOLEN", "MISLEADING", "PROHIBITED", "OTHER"] as const;

export const REPORT_REASON_LABELS: Record<(typeof REPORT_REASONS)[number], string> = {
  SCAM: "Looks like a scam",
  STOLEN: "Might be stolen",
  MISLEADING: "Photos or description don’t match",
  PROHIBITED: "Not allowed on Trego",
  OTHER: "Something else",
};

export const reportSchema = z.object({
  reason: z.enum(REPORT_REASONS, "Choose a reason"),
  details: z.string().trim().max(1000).default(""),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ListingInput = z.infer<typeof listingSchema>;
