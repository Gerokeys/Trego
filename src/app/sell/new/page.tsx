import { requireVerifiedUser } from "@/lib/auth";
import { ListingForm } from "@/components/listing-form";
import { createListingAction } from "./actions";

export const metadata = { title: "Sell an item — Trego" };

export default async function NewListingPage() {
  await requireVerifiedUser("/sell/new");

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">List an item for sale</h1>
      <p className="mt-2 text-sm text-muted">
        Accurate condition and defect disclosure is what makes buyer
        protection possible. Listings with missing or misleading information
        are the fastest way to lose a dispute.
      </p>
      <ListingForm mode="create" action={createListingAction} />
    </div>
  );
}
