import Link from "next/link";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/listings", label: "Listings" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/disputes", label: "Disputes" },
];

/** Shared sub-navigation so every admin page is one click from the others. */
export function AdminNav({ current }: { current: string }) {
  return (
    <nav aria-label="Admin sections" className="border-b border-border">
      <ul className="flex gap-1 overflow-x-auto pb-px text-sm whitespace-nowrap">
        {TABS.map((tab) => {
          const active = tab.href === current;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`inline-block rounded-t-lg px-3 py-2 ${
                  active
                    ? "border-b-2 border-foreground font-semibold"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
