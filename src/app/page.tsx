import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getWatchedIds } from "@/lib/shopper";
import { ListingCard } from "@/components/listing-card";
import { HeroCarousel, type HeroSlide } from "@/components/hero-carousel";
import { CATEGORIES } from "@/lib/categories";
import { ESCROW_STEPS } from "@/lib/escrow";

const HERO_SLIDES: HeroSlide[] = [
  {
    title: "Buy and sell used tech without the guesswork",
    body: "Phones, laptops, PCs, monitors, cameras and parts, with condition and defects disclosed on every listing.",
    cta: { label: "Browse listings", href: "/browse" },
    images: [
      { src: "/photos/S26U.jpg", alt: "Samsung Galaxy S26 Ultra" },
      { src: "/photos/px10pf.jpg", alt: "Google Pixel 10 Pro Fold" },
      { src: "/photos/macbook.webp", alt: "MacBook Pro" },
      { src: "/photos/sony camera.webp", alt: "Sony Alpha camera" },
    ],
  },
  {
    title: "Your money stays safe until you’re happy",
    body: "With Trego Escrow (launching soon), the seller only gets paid once you’ve checked what you bought.",
    cta: { label: "How escrow works", href: "/protection" },
    images: [
      { src: "/photos/px9.jpg", alt: "Google Pixel 9 Pro" },
      { src: "/photos/A55.jpg", alt: "Samsung Galaxy A55" },
      { src: "/photos/infinix smart 10.jpeg", alt: "Infinix Smart 10" },
      { src: "/photos/s25.avif", alt: "Samsung Galaxy S25" },
    ],
  },
  {
    title: "Upgrade your setup for less",
    body: "Used monitors, SSDs, RAM and gaming PCs, graded honestly.",
    cta: { label: "Shop components", href: "/browse?category=COMPONENTS" },
    images: [
      { src: "/photos/gaming pc.webp", alt: "White gaming PC" },
      { src: "/photos/monitors.jpeg", alt: "Samsung Odyssey G7 monitor" },
      { src: "/photos/ssd.webp", alt: "WD Blue NVMe SSD" },
      { src: "/photos/ram photos.jpg", alt: "DDR5 RAM kit" },
    ],
  },
  {
    title: "Turn your old tech into cash",
    body: "List it in a few minutes. Set your price, disclose its condition honestly, and reach buyers looking for exactly that.",
    cta: { label: "Start selling", href: "/sell/new" },
    images: [
      { src: "/photos/ifxh10.webp", alt: "Infinix phone, white" },
      { src: "/photos/ifx.jpg", alt: "Infinix phone, green" },
      { src: "/photos/s25u.png", alt: "Samsung Galaxy S25 Ultra" },
      { src: "/photos/px10.jpg", alt: "Google Pixel 10" },
    ],
  },
];

const BRAND_TILES = [
  { label: "Samsung", query: "Samsung", image: "/photos/S26U.jpg" },
  { label: "Google Pixel", query: "Google", image: "/photos/px9.jpg" },
  { label: "Apple", query: "Apple", image: "/photos/macbook.webp" },
  { label: "Infinix", query: "Infinix", image: "/photos/infinix smart 10.jpeg" },
];

/** eBay-style tile: product shot on a light grey square, label underneath. */
function ProductTile({
  href,
  label,
  image,
  sizes,
}: {
  href: string;
  label: string;
  image: string;
  sizes: string;
}) {
  return (
    <Link href={href} className="group flex flex-col gap-2">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-tile">
        {/* multiply blends the photos' white backgrounds into the grey tile */}
        <Image
          src={image}
          alt=""
          fill
          sizes={sizes}
          className="object-contain p-4 mix-blend-multiply transition duration-300 group-hover:scale-105"
        />
      </div>
      <span className="text-sm group-hover:underline">{label}</span>
    </Link>
  );
}

export default async function HomePage() {
  const user = await getCurrentUser();
  const [recentListings, watchedIds] = await Promise.all([
    db.listing.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        photos: { orderBy: { position: "asc" }, take: 1 },
        seller: { select: { userId: true } },
      },
    }),
    getWatchedIds(user?.id),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4">
      <h1 className="sr-only">Trego: trusted transactions for used goods in Kenya</h1>

      <div className="pt-6">
        <HeroCarousel slides={HERO_SLIDES} />
      </div>

      <section className="pt-12">
        <h2 className="text-xl font-semibold tracking-tight">Shop by category</h2>
        <div className="mt-5 grid grid-cols-3 gap-4 sm:grid-cols-6">
          {CATEGORIES.map((category) => (
            <ProductTile
              key={category.value}
              href={`/browse?category=${category.value}`}
              label={category.label}
              image={category.image}
              sizes="(max-width: 640px) 33vw, 180px"
            />
          ))}
        </div>
      </section>

      <section className="pt-12">
        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <span className="inline-block rounded-full bg-highlight-soft px-3 py-1 text-xs font-medium text-highlight">
                Trego Escrow · launching soon
              </span>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                Your money stays safe until you’re happy
              </h2>
              <p className="mt-2 text-muted">
                Paying a stranger upfront is how most used-phone scams
                happen. With escrow, we hold your payment and only release
                it to the seller once you’ve checked the item.
              </p>
            </div>
            <Link
              href="/protection"
              className="shrink-0 text-sm font-medium text-highlight underline"
            >
              How escrow works →
            </Link>
          </div>

          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ESCROW_STEPS.map((step, i) => (
              <li
                key={step.title}
                className="rounded-xl border border-border bg-background p-5"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="pt-12">
        <h2 className="text-xl font-semibold tracking-tight">Shop by brand</h2>
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {BRAND_TILES.map((tile) => (
            <ProductTile
              key={tile.label}
              href={`/browse?q=${encodeURIComponent(tile.query)}`}
              label={tile.label}
              image={tile.image}
              sizes="(max-width: 640px) 50vw, 270px"
            />
          ))}
        </div>
      </section>

      <section className="pt-12">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Recently listed</h2>
          <Link href="/browse" className="text-sm text-highlight underline">
            See all
          </Link>
        </div>

        {recentListings.length === 0 ? (
          <p className="mt-10 text-center text-muted">
            Nothing listed yet —{" "}
            <Link href="/sell/new" className="text-highlight underline">
              be the first to sell something
            </Link>
            .
          </p>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {recentListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                watched={watchedIds.has(listing.id)}
                showWatch={listing.seller.userId !== user?.id}
              />
            ))}
          </div>
        )}
      </section>

      <section className="py-12">
        <div className="flex flex-col items-start gap-6 rounded-2xl bg-tile px-6 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Selling made easy
            </h2>
            <p className="mt-1 text-muted">
              List in minutes, disclose condition honestly, and get paid
              through escrow once it launches.
            </p>
          </div>
          <Link
            href="/sell/new"
            className="shrink-0 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground hover:opacity-90"
          >
            Start selling
          </Link>
        </div>
      </section>
    </div>
  );
}
