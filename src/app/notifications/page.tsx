import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { NotificationItem } from "@/components/notification-item";
import { markAllReadAction } from "./actions";

export const metadata = { title: "Notifications — Trego" };

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        {unread > 0 ? (
          <form action={markAllReadAction}>
            <button type="submit" className="text-sm text-highlight underline">
              Mark all as read
            </button>
          </form>
        ) : null}
      </div>

      {notifications.length === 0 ? (
        <p className="mt-8 text-muted">
          No notifications yet. We’ll let you know when someone watches your
          listings or adds them to their cart.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {notifications.map((n) => (
            <li key={n.id}>
              <NotificationItem notification={n} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
