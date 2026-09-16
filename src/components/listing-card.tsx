import Link from "next/link";
import Image from "next/image";
import { formatMinorUnits } from "@/lib/money";
import { CONDITION_LABELS } from "@/lib/conditions";
import { WatchButton } from "@/components/watch-button";

export type ListingCardData = {
  id: string;
  title: string;
  brand: string;
  model: string;
  conditionGrade: string;
  priceMinorUnits: number;
  currency: string;
  status?: string;
  county?: string | null;
  photos: { url: string }[];
};

export function ListingCard({
  listing,
  watched = false,
  showWatch = true,
}: {
  listing: ListingCardData;
  watched?: boolean;
  showWatch?: boolean;
}) {
  const photo = listing.photos[0];

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition hover:border-accent/60">
      <Link href={`/listings/${listing.id}`} className="flex flex-1 flex-col">
        <div className="relative aspect-square w-full border-b border-border bg-surface">
          {photo ? (
            <Image
              src={photo.url}
              alt={listing.title}
              fill
              className="object-contain p-3"
              sizes="(max-width: 640px) 50vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted">
              No photo
            </div>
          )}
          {listing.status === "SOLD" ? (
            <span className="absolute top-2 left-2 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
              Sold
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-1 p-3">
          <span className="text-xs text-muted">
            {CONDITION_LABELS[listing.conditionGrade] ?? listing.conditionGrade}
          </span>
          <span className="text-sm font-medium leading-snug">
            {listing.title}
          </span>
          <span className="text-sm font-semibold">
            {formatMinorUnits(listing.priceMinorUnits, listing.currency)}
          </span>
          {listing.county ? (
            <span className="text-xs text-muted">{listing.county}</span>
          ) : null}
        </div>
      </Link>
      {showWatch ? (
        <WatchButton
          listingId={listing.id}
          watched={watched}
          variant="icon"
          className="absolute top-2 right-2"
        />
      ) : null}
    </div>
  );
}
