import { timeAgo } from "@/lib/time";

type NotificationData = {
  id: string;
  title: string;
  body: string;
  readAt: Date | null;
  createdAt: Date;
};

export function NotificationItem({
  notification,
  compact = false,
}: {
  notification: NotificationData;
  compact?: boolean;
}) {
  const unread = !notification.readAt;

  return (
    // Plain <a>: the Route Handler behind it marks the notification read.
    <a
      href={`/notifications/${notification.id}`}
      className="flex gap-3 px-4 py-3 hover:bg-background"
    >
      <span
        aria-hidden="true"
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${unread ? "bg-highlight" : ""}`}
      />
      <span className="min-w-0 flex-1">
        {unread ? <span className="sr-only">Unread: </span> : null}
        <span className="block text-sm font-medium">{notification.title}</span>
        {notification.body ? (
          <span className={`block text-sm text-muted ${compact ? "truncate" : ""}`}>
            {notification.body}
          </span>
        ) : null}
        <span className="mt-0.5 block text-xs text-muted">
          {timeAgo(notification.createdAt)}
        </span>
      </span>
    </a>
  );
}
