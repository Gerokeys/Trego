import "server-only";
import { db } from "./db";
import { sendSms } from "./sms";
import { SITE_URL } from "./site";

export const WELCOME_NOTIFICATION = {
  title: "Welcome to Trego",
  body: "Save listings to your Watchlist, add them to your cart, or list something to sell.",
  href: "/browse",
};

type NotificationInput = {
  title: string;
  body?: string;
  href?: string;
  /**
   * Also text the user's verified phone number. Reserve for things that need
   * action or involve money: new conversations, offers, and order updates.
   */
  sms?: boolean;
};

export async function notify(userId: string, notification: NotificationInput) {
  await db.notification.create({
    data: {
      userId,
      title: notification.title,
      body: notification.body ?? "",
      href: notification.href ?? null,
    },
  });

  if (!notification.sms) return;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { phoneNumber: true, phoneVerifiedAt: true },
  });
  if (!user?.phoneNumber || !user.phoneVerifiedAt) return;

  const detail = notification.body ? ` "${notification.body.slice(0, 60)}"` : "";
  const link = notification.href ? ` ${SITE_URL}${notification.href}` : "";
  await sendSms(user.phoneNumber, `Trego: ${notification.title}${detail}.${link}`);
}

export async function notifyAdmins(notification: NotificationInput) {
  const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  for (const admin of admins) {
    await notify(admin.id, notification);
  }
}
