"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { safeNextPath } from "@/lib/site";

export type LoginState = { error: string | null };

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    phoneNumber: formData.get("phoneNumber"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { phoneNumber, password } = parsed.data;

  const user = await db.user.findUnique({ where: { phoneNumber } });
  // Google-only accounts have no password hash, so they fall through here too.
  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Incorrect phone number or password." };
  }
  if (user.suspendedAt) {
    return { error: "This account has been suspended." };
  }

  await createSession(user.id);
  redirect(safeNextPath(formData.get("next")));
}
