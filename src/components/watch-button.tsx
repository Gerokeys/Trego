import { toggleWatchAction } from "@/app/watchlist/actions";
import { HeartIcon } from "@/components/icons";

export function WatchButton({
  listingId,
  watched,
  variant,
  className = "",
}: {
  listingId: string;
  watched: boolean;
  variant: "icon" | "full";
  className?: string;
}) {
  return (
    <form action={toggleWatchAction} className={className}>
      <input type="hidden" name="listingId" value={listingId} />
      {variant === "icon" ? (
        <button
          type="submit"
          aria-label={watched ? "Remove from Watchlist" : "Add to Watchlist"}
          aria-pressed={watched}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface/95 shadow-sm hover:border-foreground"
        >
          <HeartIcon filled={watched} className={`h-4.5 w-4.5 ${watched ? "text-highlight" : ""}`} />
        </button>
      ) : (
        <button
          type="submit"
          aria-pressed={watched}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-foreground bg-surface px-6 py-3 font-semibold hover:bg-background"
        >
          <HeartIcon filled={watched} className={`h-4.5 w-4.5 ${watched ? "text-highlight" : ""}`} />
          {watched ? "Watching" : "Add to Watchlist"}
        </button>
      )}
    </form>
  );
}
