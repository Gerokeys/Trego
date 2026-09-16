import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { toLocalPhone } from "@/lib/phone";
import { timeAgo } from "@/lib/time";
import { AdminNav } from "@/components/admin-nav";
import { ShieldCheckIcon } from "@/components/icons";

export const metadata = { title: "Users — Admin" };

const FILTERS = [
  { value: "", label: "Everyone" },
  { value: "verified", label: "Phone verified" },
  { value: "unverified", label: "Not verified" },
  { value: "sellers", label: "Sellers" },
  { value: "suspended", label: "Suspended" },
  { value: "admins", label: "Admins" },
];

const PAGE_SIZE = 25;

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  await requireAdmin();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const filter = typeof params.filter === "string" ? params.filter : "";
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.UserWhereInput = {
    ...(q
      ? {
          OR: [
            { displayName: { contains: q, mode: "insensitive" } },
            { phoneNumber: { contains: q } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(filter === "verified" ? { phoneVerifiedAt: { not: null } } : {}),
    ...(filter === "unverified" ? { phoneVerifiedAt: null } : {}),
    ...(filter === "suspended" ? { suspendedAt: { not: null } } : {}),
    ...(filter === "admins" ? { role: "ADMIN" as const } : {}),
    ...(filter === "sellers" ? { sellerProfile: { isNot: null } } : {}),
  };

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        sellerProfile: { select: { id: true, _count: { select: { listings: true } } } },
        _count: { select: { purchases: true, sales: true } },
      },
    }),
    db.user.count({ where }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (n: number) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (filter) next.set("filter", filter);
    if (n > 1) next.set("page", String(n));
    const query = next.toString();
    return query ? `/admin/users?${query}` : "/admin/users";
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
      <div className="mt-4">
        <AdminNav current="/admin/users" />
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm">
          Search
          <input
            name="q"
            defaultValue={q}
            placeholder="Name, phone or email"
            className="w-64 rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-highlight"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          Show
          <select
            name="filter"
            defaultValue={filter}
            className="rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-highlight"
          >
            {FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90"
        >
          Apply
        </button>
        {q || filter ? (
          <Link href="/admin/users" className="text-sm text-highlight underline">
            Clear
          </Link>
        ) : null}
      </form>

      <p className="mt-4 text-sm text-muted">
        {total.toLocaleString("en-KE")} {total === 1 ? "account" : "accounts"}
        {pages > 1 ? ` · page ${page} of ${pages}` : ""}
      </p>

      <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-160 text-left text-sm">
          <thead className="border-b border-border bg-background text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Name</th>
              <th scope="col" className="px-4 py-3 font-medium">Contact</th>
              <th scope="col" className="px-4 py-3 font-medium">Listings</th>
              <th scope="col" className="px-4 py-3 font-medium">Bought / sold</th>
              <th scope="col" className="px-4 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No accounts match.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className={user.suspendedAt ? "opacity-60" : ""}>
                  <th scope="row" className="px-4 py-3 font-medium">
                    <Link href={`/admin/users/${user.id}`} className="hover:underline">
                      {user.displayName}
                    </Link>
                    <span className="mt-0.5 flex flex-wrap gap-1.5">
                      {user.role === "ADMIN" ? (
                        <span className="rounded-full bg-tile px-2 py-0.5 text-xs font-normal">Admin</span>
                      ) : null}
                      {user.suspendedAt ? (
                        <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-normal text-danger">
                          Suspended
                        </span>
                      ) : null}
                    </span>
                  </th>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5">
                      {user.phoneNumber ? toLocalPhone(user.phoneNumber) : "—"}
                      {user.phoneVerifiedAt ? (
                        <ShieldCheckIcon className="h-3.5 w-3.5 text-highlight" />
                      ) : null}
                    </span>
                    {user.email ? <span className="block text-xs text-muted">{user.email}</span> : null}
                  </td>
                  <td className="px-4 py-3">{user.sellerProfile?._count.listings ?? 0}</td>
                  <td className="px-4 py-3">
                    {user._count.purchases} / {user._count.sales}
                  </td>
                  <td className="px-4 py-3 text-muted">{timeAgo(user.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 ? (
        <div className="mt-4 flex items-center gap-3 text-sm">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="text-highlight underline">
              ← Previous
            </Link>
          ) : null}
          {page < pages ? (
            <Link href={pageHref(page + 1)} className="text-highlight underline">
              Next →
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
