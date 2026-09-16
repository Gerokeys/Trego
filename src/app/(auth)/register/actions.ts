"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { createSession } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";
import { notify, WELCOME_NOTIFICATION } from "@/lib/notifications";
import { safeNextPath } from "@/lib/site";

export type RegisterState = { error: string | null };

export async function registerAction(
  _prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    phoneNumber: formData.get("phoneNumber"),
    displayName: formData.get("displayName"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { phoneNumber, displayName, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { phoneNumber } });
  if (existing) {
    return { error: "An account with that phone number already exists." };
  }

  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: { phoneNumber, displayName, passwordHash },
  });
  await notify(user.id, WELCOME_NOTIFICATION);

  await createSession(user.id);
  // Verify the number straight away: selling, messaging and buying need it.
  const next = safeNextPath(formData.get("next"));
  redirect(`/account/verify-phone?next=${encodeURIComponent(next)}`);
}
