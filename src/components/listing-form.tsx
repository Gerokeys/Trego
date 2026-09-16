"use client";

import { useActionState } from "react";
import Image from "next/image";
import { CATEGORIES } from "@/lib/categories";
import { COUNTIES } from "@/lib/kenya";

export type ListingFormState = { error: string | null };

export type ListingDefaults = {
  category: string;
  title: string;
  brand: string;
  model: string;
  storageGb: number | null;
  priceMajorUnits: number;
  conditionGrade: string;
  defectsDescription: string;
  imei: string | null;
  county: string | null;
  area: string | null;
  meetUp: boolean;
  delivery: boolean;
  acceptsOffers: boolean;
};

const CONDITION_OPTIONS = [
  { value: "LIKE_NEW", label: "Like new — no visible wear, fully functional" },
  { value: "GOOD", label: "Good — light wear, fully functional" },
  { value: "FAIR", label: "Fair — visible wear and/or minor issues (describe below)" },
  { value: "FOR_PARTS", label: "For parts — not fully functional" },
];

const fieldClass =
  "rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-highlight";

/** Sell and edit form. Server validation is the source of truth; see listingSchema. */
export function ListingForm({
  action,
  mode,
  defaults,
  existingPhotos = [],
}: {
  action: (state: ListingFormState, formData: FormData) => Promise<ListingFormState>;
  mode: "create" | "edit";
  defaults?: ListingDefaults;
  existingPhotos?: { id: string; url: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const d = defaults;

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-5">
      <label className="flex flex-col gap-1.5 text-sm">
        Category
        <select name="category" required defaultValue={d?.category ?? "PHONES"} className={fieldClass}>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        Listing title
        <input
          name="title"
          required
          defaultValue={d?.title}
          placeholder="iPhone 12, 128GB, unlocked"
          className={fieldClass}
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          Brand
          <input name="brand" required defaultValue={d?.brand} placeholder="Apple" className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          Model
          <input name="model" required defaultValue={d?.model} placeholder="iPhone 12" className={fieldClass} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          Storage / capacity (GB)
          <input
            name="storageGb"
            type="number"
            min={1}
            defaultValue={d?.storageGb ?? undefined}
            placeholder="128"
            className={fieldClass}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          Price (KES)
          <input
            name="priceMajorUnits"
            type="number"
            min={1}
            step="1"
            required
            defaultValue={d?.priceMajorUnits}
            placeholder="25000"
            className={fieldClass}
          />
        </label>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="acceptsOffers"
          defaultChecked={d?.acceptsOffers ?? true}
          className="mt-1"
        />
        <span>
          Accept offers
          <span className="block text-xs text-muted">
            Buyers can offer a lower price. You accept or decline each one.
          </span>
        </span>
      </label>

      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="mb-1">Condition</legend>
        {CONDITION_OPTIONS.map((opt) => (
          <label key={opt.value} className="flex items-start gap-2">
            <input
              type="radio"
              name="conditionGrade"
              value={opt.value}
              required
              defaultChecked={d?.conditionGrade === opt.value}
              className="mt-1"
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </fieldset>

      <label className="flex flex-col gap-1.5 text-sm">
        Defects &amp; disclosures
        <textarea
          name="defectsDescription"
          rows={3}
          defaultValue={d?.defectsDescription}
          placeholder="e.g. small scratch on back glass, battery health 87%. Leave blank only if there truly are none."
          className={fieldClass}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        IMEI (phones only, 15 digits)
        <input
          name="imei"
          inputMode="numeric"
          pattern="\d{15}"
          defaultValue={d?.imei ?? ""}
          placeholder="356938035643809"
          className={fieldClass}
        />
        <span className="text-xs text-muted">
          Dial *#06# to find it. We check it’s a valid IMEI. Only the last 4
          digits are ever shown publicly; the full IMEI is kept for disputes.
        </span>
      </label>

      <fieldset className="flex flex-col gap-3 text-sm">
        <legend className="mb-1">Where is the item?</legend>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            County
            <select name="county" required defaultValue={d?.county ?? ""} className={fieldClass}>
              <option value="" disabled>
                Choose a county
              </option>
              {COUNTIES.map((county) => (
                <option key={county} value={county}>
                  {county}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            Area or town (optional)
            <input
              name="area"
              maxLength={60}
              defaultValue={d?.area ?? ""}
              placeholder="Westlands"
              className={fieldClass}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="mb-1">How can the buyer get it?</legend>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="meetUp" defaultChecked={d?.meetUp ?? true} />
          Meet up in person
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="delivery" defaultChecked={d?.delivery ?? false} />
          I can deliver or ship it
        </label>
      </fieldset>

      {existingPhotos.length > 0 ? (
        <fieldset className="text-sm">
          <legend className="mb-2">Current photos (tick any to remove)</legend>
          <div className="grid grid-cols-4 gap-2">
            {existingPhotos.map((photo, i) => (
              <label
                key={photo.id}
                className="relative flex aspect-square cursor-pointer flex-col overflow-hidden rounded-lg border border-border bg-surface has-checked:border-danger has-checked:opacity-60"
              >
                <Image src={photo.url} alt={`Photo ${i + 1}`} fill sizes="120px" className="object-contain p-1" />
                <span className="absolute inset-x-1 bottom-1 flex items-center gap-1 rounded bg-surface/90 px-1.5 py-0.5 text-xs">
                  <input type="checkbox" name="removePhoto" value={photo.id} />
                  Remove
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <label className="flex flex-col gap-1.5 text-sm">
        {mode === "create" ? "Photos (up to 8)" : "Add photos"}
        <input
          name="photos"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          required={mode === "create"}
          className={fieldClass}
        />
        <span className="text-xs text-muted">
          Photos are resized and location data is removed before they’re saved.
        </span>
      </label>

      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}

      <div className="mt-2 flex flex-wrap gap-3">
        <button
          type="submit"
          name="intent"
          value="publish"
          disabled={pending}
          className="rounded-full bg-accent px-5 py-2.5 font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Saving…" : mode === "create" ? "Publish listing" : "Save changes"}
        </button>
        {mode === "create" ? (
          <button
            type="submit"
            name="intent"
            value="draft"
            disabled={pending}
            className="rounded-full border border-border bg-surface px-5 py-2.5 font-medium hover:border-foreground disabled:opacity-60"
          >
            Save as draft
          </button>
        ) : null}
      </div>
    </form>
  );
}
