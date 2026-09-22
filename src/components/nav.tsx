import Image from "next/image";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { countUnreadConversations } from "@/lib/messages";
import { logoutAction } from "@/app/(auth)/logout-action";
import { CATEGORIES } from "@/lib/categories";
import { Dropdown } from "@/components/dropdown";
import { SearchBar, SearchBarFromUrl } from "@/components/search-bar";
import { NotificationItem } from "@/components/notification-item";
import { MobileMenu } from "@/components/mobile-menu";
import { BellIcon, CartIcon, ChevronDownIcon, MessageIcon } from "@/components/icons";

async function getHeaderData(userId: string) {
  const [cartCount, watchCount, unreadCount, notifications, unreadMessages] = await Promise.all([
    db.cartItem.count({ where: { userId, listing: { status: "ACTIVE" } } }),
    db.watchlistItem.count({ where: { userId } }),
    db.notification.count({ where: { userId, readAt: null } }),
    db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    countUnreadConversations(userId),
  ]);
  return { cartCount, watchCount, unreadCount, notifications, unreadMessages };
}

function CountBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="absolute -top-1.5 -right-2 min-w-4 rounded-full bg-highlight px-1 text-center text-[10px] leading-4 font-semibold text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}

function MenuLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="block px-4 py-2 hover:bg-background">
      {children}
    </Link>
  );
}

export async function Nav() {
  const user = await getCurrentUser();
  const data = user ? await getHeaderData(user.id) : null;

  return (
    <header className="bg-surface">
      {/* Phones: eBay-style bar. Everything else lives in the menu drawer. */}
      <div className="flex items-center px-1.5 pt-1.5 sm:hidden">
        <MobileMenu
          user={user ? { firstName: user.displayName.split(" ")[0], isAdmin: user.role === "ADMIN" } : null}
          unreadMessages={data?.unreadMessages ?? 0}
          unreadNotifications={data?.unreadCount ?? 0}
          watchCount={data?.watchCount ?? 0}
        />
        <Link href="/" aria-label="Trego home" className="flex shrink-0 items-center px-1">
          <Image
            src="/trego-wordmark.png"
            alt="Trego"
            width={483}
            height={120}
            priority
            className="h-7 w-auto"
          />
        </Link>
        <div className="ml-auto flex items-center">
          <Link
            href={data ? "/notifications" : "/login"}
            aria-label={`Notifications${data?.unreadCount ? `, ${data.unreadCount} unread` : ""}`}
            className="flex p-2.5"
          >
            <span className="relative flex">
              <BellIcon className="h-6 w-6" />
              <CountBadge count={data?.unreadCount ?? 0} />
            </span>
          </Link>
          <Link href="/cart" aria-label={`Cart, ${data?.cartCount ?? 0} items`} className="flex p-2.5">
            <span className="relative flex">
              <CartIcon className="h-6 w-6" />
              <CountBadge count={data?.cartCount ?? 0} />
            </span>
          </Link>
        </div>
      </div>
      {/* Utility bar (tablet and up) */}
      <div className="hidden border-b border-border sm:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-1.5 text-xs">
          <div className="flex items-center gap-5">
            {user ? (
              <span>
                Hi, <span className="font-semibold">{user.displayName.split(" ")[0]}</span>!
              </span>
            ) : (
              <span>
                Hi!{" "}
                <Link href="/login" className="text-highlight underline">
                  Sign in
                </Link>{" "}
                or{" "}
                <Link href="/register" className="text-highlight underline">
                  register
                </Link>
              </span>
            )}
            <Link href="/protection" className="hidden hover:underline md:inline">
              How escrow works
            </Link>
            <Link href="/help" className="hidden hover:underline md:inline">
              Help &amp; Contact
            </Link>
          </div>

          <div className="flex items-center gap-5">
            <Link href="/sell/new" className="hidden hover:underline sm:inline">
              Sell
            </Link>
            <Link href="/watchlist" className="hidden hover:underline sm:inline">
              Watchlist{data?.watchCount ? ` (${data.watchCount})` : ""}
            </Link>

            {user ? (
              <Dropdown
                label={
                  <span className="flex items-center gap-1">
                    My Trego
                    <ChevronDownIcon className="h-3 w-3" />
                  </span>
                }
                buttonClassName="hover:underline"
                panelClassName="w-56 py-2"
              >
                <MenuLink href="/account">Your account &amp; listings</MenuLink>
                <MenuLink href="/orders">Orders</MenuLink>
                <MenuLink href="/offers">Offers</MenuLink>
                <MenuLink href="/messages">Messages</MenuLink>
                <MenuLink href="/watchlist">Watchlist</MenuLink>
                <MenuLink href="/saved-searches">Saved searches</MenuLink>
                <MenuLink href="/sell/new">Sell an item</MenuLink>
                {user.role === "ADMIN" ? <MenuLink href="/admin">Admin</MenuLink> : null}
                <form action={logoutAction} className="mt-2 border-t border-border pt-2">
                  <button type="submit" className="block w-full px-4 py-2 text-left hover:bg-background">
                    Log out
                  </button>
                </form>
              </Dropdown>
            ) : null}

            {data ? (
              <Link
                href="/messages"
                aria-label={`Messages${data.unreadMessages ? `, ${data.unreadMessages} unread` : ""}`}
                className="relative flex"
              >
                <MessageIcon />
                <CountBadge count={data.unreadMessages} />
              </Link>
            ) : null}

            {data ? (
              <Dropdown
                ariaLabel={`Notifications${data.unreadCount ? `, ${data.unreadCount} unread` : ""}`}
                label={
                  <span className="relative flex">
                    <BellIcon />
                    <CountBadge count={data.unreadCount} />
                  </span>
                }
                buttonClassName="flex"
                panelClassName="w-80"
              >
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <p className="font-semibold">Notifications</p>
                  <Link href="/notifications" className="text-xs text-highlight underline">
                    See all
                  </Link>
                </div>
                {data.notifications.length === 0 ? (
                  <p className="px-4 py-6 text-muted">You’re all caught up.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {data.notifications.map((n) => (
                      <li key={n.id}>
                        <NotificationItem notification={n} compact />
                      </li>
                    ))}
                  </ul>
                )}
              </Dropdown>
            ) : (
              <Link href="/login" aria-label="Notifications" className="flex">
                <BellIcon />
              </Link>
            )}

            <Link
              href="/cart"
              aria-label={`Cart, ${data?.cartCount ?? 0} items`}
              className="relative flex"
            >
              <CartIcon />
              <CountBadge count={data?.cartCount ?? 0} />
            </Link>
          </div>
        </div>
      </div>

      {/* Logo, category menu and search */}
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 border-b border-border px-4 pt-1 pb-3 sm:border-b-0 sm:py-4">
        <Link href="/" aria-label="Trego home" className="hidden shrink-0 items-center sm:flex">
          <Image
            src="/trego-wordmark.png"
            alt="Trego"
            width={483}
            height={120}
            priority
            className="h-8 w-auto sm:h-9"
          />
        </Link>

        <Dropdown
          align="left"
          label={
            <span className="flex items-center gap-1 text-left leading-tight">
              Shop by
              <br />
              category
              <ChevronDownIcon className="h-3 w-3" />
            </span>
          }
          buttonClassName="hidden text-xs text-muted hover:text-foreground sm:block"
          panelClassName="w-72 p-2"
        >
          <ul>
            {CATEGORIES.map((c) => (
              <li key={c.value}>
                <Link
                  href={`/browse?category=${c.value}`}
                  className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-background"
                >
                  <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-tile">
                    <Image
                      src={c.image}
                      alt=""
                      fill
                      sizes="36px"
                      className="object-contain p-1 mix-blend-multiply"
                    />
                  </span>
                  {c.label}
                </Link>
              </li>
            ))}
            <li className="mt-1 border-t border-border pt-1">
              <Link href="/browse" className="block rounded-lg px-2 py-2 font-medium hover:bg-background">
                All listings
              </Link>
            </li>
          </ul>
        </Dropdown>

        <Suspense fallback={<SearchBar q="" category="" />}>
          <SearchBarFromUrl />
        </Suspense>
      </div>

      {/* Category row (tablet and up; phones use the menu drawer) */}
      <nav aria-label="Categories" className="hidden border-y border-border sm:block">
        <ul className="mx-auto flex max-w-6xl gap-6 overflow-x-auto px-4 py-2.5 text-sm whitespace-nowrap text-foreground/80 md:justify-center">
          <li>
            <Link href="/browse" className="hover:text-foreground hover:underline">
              All listings
            </Link>
          </li>
          {CATEGORIES.map((c) => (
            <li key={c.value}>
              <Link href={`/browse?category=${c.value}`} className="hover:text-foreground hover:underline">
                {c.label}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/protection" className="hover:text-foreground hover:underline">
              Escrow
            </Link>
          </li>
          <li>
            <Link href="/sell/new" className="hover:text-foreground hover:underline">
              Sell
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
