import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireVerifiedUser } from "@/lib/auth";
import { ListingForm } from "@/components/listing-form";
import { updateListingAction } from "./actions";

export const metadata = { title: "Edit listing — Trego" };

export default async function EditListingPage({ params }: PageProps<"/listings/[id]/edit">) {
  const { id } = await params;
  const user = await requireVerifiedUser(`/listings/${id}/edit`);

  const listing = await db.listing.findUnique({
    where: { id },
    include: { seller: { select: { userId: true } }, photos: { orderBy: { position: "asc" } } },
  });
  if (!listing || listing.seller.userId !== user.id) notFound();

  if (listing.status !== "DRAFT" && listing.status !== "ACTIVE") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">This listing can’t be edited</h1>
        <p className="mt-2 text-muted">
          Listings that are in escrow or sold are kept exactly as the buyer
          saw them, because disputes are judged against them.
        </p>
        <Link href={`/listings/${id}`} className="mt-6 inline-block text-highlight underline">
          Back to the listing
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Edit listing</h1>
      <p className="mt-2 text-sm text-muted">
        Lowering the price notifies everyone watching this listing.
      </p>
      <ListingForm
        mode="edit"
        action={updateListingAction.bind(null, id)}
        defaults={{
          category: listing.category,
          title: listing.title,
          brand: listing.brand,
          model: listing.model,
          storageGb: listing.storageGb,
          priceMajorUnits: listing.priceMinorUnits / 100,
          conditionGrade: listing.conditionGrade,
          defectsDescription: listing.defectsDescription,
          imei: listing.imei,
          county: listing.county,
          area: listing.area,
          meetUp: listing.meetUp,
          delivery: listing.delivery,
          acceptsOffers: listing.acceptsOffers,
        }}
        existingPhotos={listing.photos.map((p) => ({ id: p.id, url: p.url }))}
      />
    </div>
  );
}
