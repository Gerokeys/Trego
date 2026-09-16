import { StarIcon } from "@/components/icons";

export function StarRating({
  rating,
  className = "h-4 w-4",
}: {
  rating: number;
  className?: string;
}) {
  const filled = Math.round(rating);
  return (
    <span
      role="img"
      aria-label={`${rating.toFixed(1)} out of 5 stars`}
      className="inline-flex items-center gap-0.5 text-amber-500"
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} filled={n <= filled} className={className} />
      ))}
    </span>
  );
}
