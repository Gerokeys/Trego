import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { NewsletterForm } from "@/components/newsletter-form";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      ...CATEGORIES.map((c) => ({ label: c.label, href: `/browse?category=${c.value}` })),
      { label: "All listings", href: "/browse" },
    ],
  },
  {
    title: "Buying",
    links: [
      { label: "How escrow works", href: "/protection" },
      { label: "Condition grades", href: "/help#condition-grades" },
      { label: "Buyer FAQ", href: "/help" },
    ],
  },
  {
    title: "Selling",
    links: [
      { label: "Start selling", href: "/sell/new" },
      { label: "How payouts work", href: "/protection#for-sellers" },
      { label: "Your listings", href: "/account" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About us", href: "/about" },
      { label: "Help center", href: "/help" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of use", href: "/terms" },
      { label: "Privacy policy", href: "/privacy" },
    ],
  },
];

// Planned escrow payment methods: shown as plain text, not partner logos,
// because no payment partner is signed yet.
const PAYMENT_METHODS = ["M-Pesa", "Airtel Money", "Visa", "Mastercard"];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-6 border-b border-border py-10 md:grid-cols-2 md:items-center md:gap-12">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Stay in the loop
            </h2>
            <p className="mt-1 text-sm text-muted">
              Be the first to hear about new listings, price drops, and when
              Trego Escrow goes live. No spam.
            </p>
          </div>
          <NewsletterForm />
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-10 sm:grid-cols-3 lg:grid-cols-6">
          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-semibold">{column.title}</h3>
              <ul className="mt-4 flex flex-col gap-2.5 text-sm text-muted">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="text-sm font-semibold">Payments</h3>
            <p className="mt-4 text-sm text-muted">
              Held in escrow until you confirm the item. Coming soon with:
            </p>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {PAYMENT_METHODS.map((method) => (
                <li
                  key={method}
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium"
                >
                  {method}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Trego — trusted transactions for used goods, in Kenya.</p>
          <p>
            Escrow payments are not live yet.{" "}
            <Link href="/protection" className="underline hover:text-foreground">
              See current status
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
