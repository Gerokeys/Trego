import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/**
 * Marks a notification read, then follows its link. Only reach this through
 * a plain <a>: <Link> prefetching would mark notifications read on hover.
 */
export async function GET(_request: NextRequest, ctx: RouteContext<"/notifications/[id]">) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await ctx.params;
  const notification = await db.notification.findFirst({
    where: { id, userId: user.id },
  });
  if (!notification) {
    redirect("/notifications");
  }

  if (!notification.readAt) {
    await db.notification.update({ where: { id }, data: { readAt: new Date() } });
  }

  const href = notification.href;
  redirect(href && href.startsWith("/") && !href.startsWith("//") ? href : "/notifications");
}
