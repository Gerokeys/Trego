"use server";

import { z } from "zod";
import { db } from "@/lib/db";

export type NewsletterState = {
  status: "idle" | "success" | "error";
  message: string | null;
};

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address."));

export async function subscribeAction(
  _prevState: NewsletterState,
  formData: FormData
): Promise<NewsletterState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { status: "error", message: "Enter a valid email address." };
  }

  // Upsert so signing up twice is a no-op rather than an error.
  await db.newsletterSubscriber.upsert({
    where: { email: parsed.data },
    update: {},
    create: { email: parsed.data },
  });

  return {
    status: "success",
    message: "You’re on the list. We’ll email you about new drops and when escrow goes live.",
  };
}
