"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { phoneNumberSchema, verificationCodeSchema } from "@/lib/validation";
import { checkVerificationCode, sendVerificationCode } from "@/lib/phone-verification";
import { safeNextPath } from "@/lib/site";

export type VerifyPhoneState = {
  step: "phone" | "code";
  phoneNumber: string;
  error: string | null;
  /** Only set in development when SMS isn't configured. */
  devCode?: string;
};

export async function verifyPhoneAction(
  prev: VerifyPhoneState,
  formData: FormData
): Promise<VerifyPhoneState> {
  const user = await requireUser("/account/verify-phone");
  const intent = formData.get("intent");

  if (intent === "change") {
    return { step: "phone", phoneNumber: prev.phoneNumber, error: null };
  }

  if (intent === "send") {
    const phone = phoneNumberSchema.safeParse(formData.get("phoneNumber"));
    if (!phone.success) {
      return {
        step: "phone",
        phoneNumber: String(formData.get("phoneNumber") ?? ""),
        error: phone.error.issues[0]?.message ?? "Enter a valid phone number.",
      };
    }
    const takenByVerified = await db.user.findFirst({
      where: { phoneNumber: phone.data, phoneVerifiedAt: { not: null }, NOT: { id: user.id } },
      select: { id: true },
    });
    if (takenByVerified) {
      return { step: "phone", phoneNumber: phone.data, error: "That number is already verified on another account." };
    }
    const sent = await sendVerificationCode(user.id, phone.data);
    if (!sent.ok) return { ...prev, phoneNumber: phone.data, error: sent.error };
    return { step: "code", phoneNumber: phone.data, error: null, devCode: sent.devCode };
  }

  const code = verificationCodeSchema.safeParse(formData.get("code"));
  if (!code.success) return { ...prev, error: code.error.issues[0]?.message ?? "Enter the 6-digit code." };
  const checked = await checkVerificationCode(user.id, code.data);
  if (!checked.ok) return { ...prev, error: checked.error };

  const applied = await db.$transaction(async (tx) => {
    const holder = await tx.user.findUnique({ where: { phoneNumber: checked.phoneNumber } });
    if (holder && holder.id !== user.id) {
      if (holder.phoneVerifiedAt) return false;
      // Someone registered with this number without ever proving they own
      // it; the person who just proved ownership takes it over.
      await tx.user.update({ where: { id: holder.id }, data: { phoneNumber: null } });
    }
    await tx.user.update({
      where: { id: user.id },
      data: { phoneNumber: checked.phoneNumber, phoneVerifiedAt: new Date() },
    });
    return true;
  });
  if (!applied) return { ...prev, error: "That number is already verified on another account." };

  revalidatePath("/", "layout");
  redirect(safeNextPath(formData.get("next"), "/account"));
}
