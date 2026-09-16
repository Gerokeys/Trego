import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { sweepEscrowDeadlines } from "@/lib/orders";

export const metadata = { title: "Admin — Trego" };

export default async function AdminPage() {
  await requireAdmin();
  // Opening the admin area also applies any escrow deadlines that have passed.
  await sweepEscrowDeadlines();

  const [openReports, openDisputes, inEscrow, activeListings, users] = await Promise.all([
    db.report.count({ where: { status: "OPEN" } }),
    db.dispute.count({ where: { status: "OPEN" } }),
    db.order.count({ where: { status: { in: ["PAID", "HANDED_OVER", "DISPUTED"] } } }),
    db.listing.count({ where: { status: "ACTIVE" } }),
    db.user.count(),
  ]);

  const cards = [
    { href: "/admin/reports", label: "Open reports", value: openReports },
    { href: "/admin/disputes", label: "Open disputes", value: openDisputes },
    { href: "/orders", label: "Orders in escrow", value: inEscrow },
    { href: "/browse", label: "Live listings", value: activeListings },
    { href: "/admin", label: "Accounts", value: users },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-border bg-surface p-4 hover:border-foreground"
          >
            <p className="text-2xl font-semibold">{card.value}</p>
            <p className="mt-1 text-sm text-muted">{card.label}</p>
          </Link>
        ))}
      </div>
      <p className="mt-6 text-sm text-muted">
        Escrow deadlines are applied whenever these pages load, and by the
        scheduled check at /api/cron/escrow.
      </p>
    </div>
  );
}
