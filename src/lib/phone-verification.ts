import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { db } from "./db";
import { isSmsConfigured, sendSms } from "./sms";

const CODE_TTL_MINUTES = 10;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_SENDS_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;

function hashCode(code: string) {
  return createHmac("sha256", process.env.SESSION_SECRET ?? "").update(code).digest("hex");
}

export type SendCodeResult =
  | { ok: true; devCode?: string }
  | { ok: false; error: string };

export async function sendVerificationCode(
  userId: string,
  phoneNumber: string
): Promise<SendCodeResult> {
  const recent = await db.phoneVerification.findMany({
    where: { userId, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
    orderBy: { createdAt: "desc" },
  });
  if (recent[0] && Date.now() - recent[0].createdAt.getTime() < RESEND_COOLDOWN_MS) {
    return { ok: false, error: "Please wait a minute before asking for another code." };
  }
  if (recent.length >= MAX_SENDS_PER_HOUR) {
    return { ok: false, error: "Too many codes requested. Try again in an hour." };
  }
  if (!isSmsConfigured() && process.env.NODE_ENV === "production") {
    return { ok: false, error: "SMS isn't set up on this server yet, so we can't send a code." };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.phoneVerification.create({
    data: {
      userId,
      phoneNumber,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000),
    },
  });

  const sent = await sendSms(
    phoneNumber,
    `Your Trego code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes. Never share it with anyone.`
  );
  if (sent) return { ok: true };
  // Local development without SMS credentials: show the code on screen so
  // the flow can be tested. (Production without SMS was refused above.)
  if (!isSmsConfigured()) return { ok: true, devCode: code };
  return { ok: false, error: "We couldn't send the SMS. Please try again." };
}

export async function checkVerificationCode(
  userId: string,
  code: string
): Promise<{ ok: true; phoneNumber: string } | { ok: false; error: string }> {
  const pending = await db.phoneVerification.findFirst({
    where: { userId, usedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!pending || pending.expiresAt < new Date()) {
    return { ok: false, error: "That code has expired. Ask for a new one." };
  }
  if (pending.attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: "Too many wrong attempts. Ask for a new code." };
  }

  const matches = timingSafeEqual(Buffer.from(hashCode(code)), Buffer.from(pending.codeHash));
  if (!matches) {
    await db.phoneVerification.update({
      where: { id: pending.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, error: "That code isn’t right. Check the SMS and try again." };
  }

  await db.phoneVerification.update({ where: { id: pending.id }, data: { usedAt: new Date() } });
  return { ok: true, phoneNumber: pending.phoneNumber };
}
