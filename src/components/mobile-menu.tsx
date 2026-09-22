"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { logoutAction } from "@/app/(auth)/logout-action";
import { CATEGORIES } from "@/lib/categories";
import { ChevronRightIcon, CloseIcon, MenuIcon } from "@/components/icons";

type MobileMenuProps = {
  user: { firstName: string; isAdmin: boolean } | null;
  unreadMessages: number;
  unreadNotifications: number;
  watchCount: number;
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-border py-2">
      <h2 className="px-4 pt-2 pb-1 text-xs font-semibold tracking-wide text-muted uppercase">{title}</h2>
      <ul>{children}</ul>
    </section>
  );
}

function Row({
  href,
  children,
  image,
  unread = 0,
  count = 0,
}: {
  href: string;
  children: ReactNode;
  image?: string;
  /** Shown as a highlighted badge: things waiting for the user. */
  unread?: number;
  /** Shown as a plain number: a running total. */
  count?: number;
}) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 px-4 py-3 text-[15px] active:bg-background">
        {image ? (
          <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-tile">
            <Image src={image} alt="" fill sizes="32px" className="object-contain p-1 mix-blend-multiply" />
          </span>
        ) : null}
        <span className="flex-1">{children}</span>
        {unread > 0 ? (
          <span className="min-w-5 rounded-full bg-highlight px-1.5 text-center text-xs leading-5 font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : count > 0 ? (
          <span className="text-sm text-muted">{count}</span>
        ) : null}
        <ChevronRightIcon className="h-4 w-4 text-muted" />
      </Link>
    </li>
  );
}

/**
 * Phone navigation, eBay style: the header keeps only this menu button, the
 * logo, notifications and cart, and everything else lives in the drawer.
 * The drawer stays mounted (and inert while closed) so it can slide both ways.
 */
export function MobileMenu({ user, unreadMessages, unreadNotifications, watchCount }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const openButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const trigger = openButton.current;
    closeButton.current?.focus();

    // Stop the page behind the drawer from scrolling.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    // Rotating to a wider screen hides the menu button, so close with it.
    const wide = window.matchMedia("(min-width: 640px)");
    function onWide(event: MediaQueryListEvent) {
      if (event.matches) setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    wide.addEventListener("change", onWide);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      wide.removeEventListener("change", onWide);
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={openButton}
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen(true)}
        className="flex p-2.5"
      >
        <MenuIcon className="h-6 w-6" />
      </button>

      <div inert={!open} className={`fixed inset-0 z-50 sm:hidden ${open ? "" : "pointer-events-none"}`}>
        <div
          aria-hidden="true"
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/40 transition-opacity duration-200 motion-reduce:transition-none ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("a")) setOpen(false);
          }}
          className={`absolute inset-y-0 left-0 flex w-[85%] max-w-xs flex-col overflow-y-auto bg-surface shadow-xl transition-transform duration-200 motion-reduce:transition-none ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <Image src="/trego-wordmark.png" alt="Trego" width={483} height={120} className="h-6 w-auto" />
            <button
              ref={closeButton}
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="-mr-2 flex p-2"
            >
              <CloseIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="px-4 pt-1 pb-4">
            {user ? (
              <p className="text-lg font-semibold">Hi, {user.firstName}!</p>
            ) : (
              <>
                <p className="text-lg font-semibold">Hi there!</p>
                <div className="mt-3 flex gap-2">
                  <Link
                    href="/login"
                    className="flex-1 rounded-full bg-accent px-4 py-2.5 text-center text-sm font-semibold text-accent-foreground"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    className="flex-1 rounded-full border border-border px-4 py-2.5 text-center text-sm font-semibold"
                  >
                    Register
                  </Link>
                </div>
              </>
            )}
            <Link
              href="/sell/new"
              className="mt-3 block rounded-full border-2 border-foreground px-4 py-2.5 text-center text-sm font-semibold"
            >
              Sell an item
            </Link>
          </div>

          {user ? (
            <Section title="My Trego">
              <Row href="/account">Account &amp; listings</Row>
              <Row href="/orders">Orders</Row>
              <Row href="/offers">Offers</Row>
              <Row href="/messages" unread={unreadMessages}>
                Messages
              </Row>
              <Row href="/notifications" unread={unreadNotifications}>
                Notifications
              </Row>
              <Row href="/watchlist" count={watchCount}>
                Watchlist
              </Row>
              <Row href="/saved-searches">Saved searches</Row>
              {user.isAdmin ? <Row href="/admin">Admin</Row> : null}
            </Section>
          ) : null}

          <Section title="Shop by category">
            <Row href="/browse">All listings</Row>
            {CATEGORIES.map((c) => (
              <Row key={c.value} href={`/browse?category=${c.value}`} image={c.image}>
                {c.label}
              </Row>
            ))}
          </Section>

          <Section title="Help">
            <Row href="/protection">How escrow works</Row>
            <Row href="/help">Help &amp; Contact</Row>
          </Section>

          {user ? (
            <form action={logoutAction} className="border-t border-border px-4 py-4">
              <button type="submit" className="text-sm font-medium text-muted">
                Log out
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </>
  );
}
