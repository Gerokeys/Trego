"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { CATEGORIES, CATEGORIES_WITH_RAM } from "@/lib/categories";
import { COUNTIES } from "@/lib/kenya";
import { isValidImei } from "@/lib/imei";
import { MAX_PHOTOS } from "@/lib/listing-data";
import { PhotoPicker } from "@/components/photo-picker";

export type ListingFormState = {
  error: string | null;
  /** The form field the error is about, when there is one. */
  field?: string;
};

export type ListingDefaults = {
  category: string;
  title: string;
  brand: string;
  model: string;
  storageGb: number | null;
  ramGb: number | null;
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

const RAM_SIZES = [1, 2, 3, 4, 6, 8, 12, 16, 18, 24, 32, 36, 48, 64, 96, 128];

const fieldClass =
  "rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-highlight aria-invalid:border-danger";

/** What's wrong with a typed IMEI, or null if it's blank or valid. */
function imeiProblem(digits: string) {
  if (!digits) return null;
  if (digits.length !== 15) return `An IMEI is 15 digits; this has ${digits.length}.`;
  if (!isValidImei(digits)) return "That IMEI isn’t valid. Dial *#06# and copy it exactly.";
  return null;
}

function FieldError({ id, message }: { id: string; message: string | null }) {
  if (!message) return null;
  return (
    <span id={id} role="alert" className="text-xs text-danger">
      {message}
    </span>
  );
}

/**
 * Sell and edit form. Server validation is the source of truth; see listingSchema.
 *
 * Submitted by hand rather than through <form action>: React resets a form
 * after its action runs, even when the action only returns an error, which
 * wiped everything (photos included) over one bad field. Submitting this way
 * keeps every value, and the error points at the field that needs fixing.
 */
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
  const formRef = useRef<HTMLFormElement>(null);
  const d = defaults;

  const [category, setCategory] = useState(d?.category ?? "PHONES");
  const [imei, setImei] = useState(d?.imei ?? "");
  const [imeiTouched, setImeiTouched] = useState(false);
  const [removedCount, setRemovedCount] = useState(0);
  // Hide a server error once its field is edited; a new submission shows the next one.
  const [editedAfter, setEditedAfter] = useState<ListingFormState | null>(null);

  const isPhone = category === "PHONES";
  const asksRam = CATEGORIES_WITH_RAM.includes(category);
  const liveImeiError = isPhone && imeiTouched ? imeiProblem(imei) : null;
  const serverField = editedAfter === state ? undefined : state.field;
  const errorFor = (name: string) => (serverField === name ? state.error : null);

  // After a rejected submit, take the seller straight to the field at fault.
  useEffect(() => {
    if (!state.field || !formRef.current) return;
    const target = formRef.current.elements.namedItem(state.field);
    const el = target instanceof RadioNodeList ? (target[0] as HTMLElement | undefined) : (target as HTMLElement | null);
    el?.focus();
  }, [state]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (isPhone && imeiProblem(imei)) {
      setImeiTouched(true);
      const imeiInput = form.elements.namedItem("imei");
      if (imeiInput instanceof HTMLElement) imeiInput.focus();
      return;
    }
    // Include the button pressed, which says publish or draft.
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(form, submitter);
    startTransition(() => formAction(formData));
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      onChange={(event) => {
        const target = event.nativeEvent.target as HTMLInputElement;
        if (target.name && target.name === state.field) setEditedAfter(state);
        if (target.name === "removePhoto") {
          setRemovedCount(formRef.current?.querySelectorAll('input[name="removePhoto"]:checked').length ?? 0);
        }
      }}
      className="mt-8 flex flex-col gap-5"
    >
      <label className="flex flex-col gap-1.5 text-sm">
        Category
        <select
          name="category"
          required
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className={fieldClass}
        >
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
          aria-invalid={Boolean(errorFor("title")) || undefined}
          className={fieldClass}
        />
        <FieldError id="title-error" message={errorFor("title")} />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          Brand
          <input
            name="brand"
            required
            defaultValue={d?.brand}
            placeholder="Apple"
            aria-invalid={Boolean(errorFor("brand")) || undefined}
            className={fieldClass}
          />
          <FieldError id="brand-error" message={errorFor("brand")} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          Model
          <input
            name="model"
            required
            defaultValue={d?.model}
            placeholder="iPhone 12"
            aria-invalid={Boolean(errorFor("model")) || undefined}
            className={fieldClass}
          />
          <FieldError id="model-error" message={errorFor("model")} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          Storage (GB)
          <input
            name="storageGb"
            type="number"
            inputMode="numeric"
            min={1}
            defaultValue={d?.storageGb ?? undefined}
            placeholder="128"
            className={fieldClass}
          />
        </label>
        {asksRam ? (
          <label className="flex flex-col gap-1.5 text-sm">
            <span>
              RAM <span className="text-muted">(optional)</span>
            </span>
            <select name="ramGb" defaultValue={d?.ramGb ?? ""} className={fieldClass}>
              <option value="">Not sure / skip</option>
              {RAM_SIZES.map((gb) => (
                <option key={gb} value={gb}>
                  {gb} GB
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        Price (KES)
        <input
          name="priceMajorUnits"
          type="number"
          inputMode="numeric"
          min={1}
          step="1"
          required
          defaultValue={d?.priceMajorUnits}
          placeholder="25000"
          aria-invalid={Boolean(errorFor("priceMajorUnits")) || undefined}
          className={fieldClass}
        />
        <FieldError id="price-error" message={errorFor("priceMajorUnits")} />
      </label>

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
        <FieldError id="condition-error" message={errorFor("conditionGrade")} />
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

      {isPhone ? (
        <label className="flex flex-col gap-1.5 text-sm">
          <span>
            IMEI <span className="text-muted">(optional, 15 digits)</span>
          </span>
          <input
            name="imei"
            inputMode="numeric"
            autoComplete="off"
            value={imei}
            // Digits only, so a pasted "35-693803-564380-9" still works.
            onChange={(event) => setImei(event.target.value.replace(/\D/g, "").slice(0, 15))}
            onBlur={() => setImeiTouched(true)}
            placeholder="356938035643809"
            aria-invalid={Boolean(liveImeiError || errorFor("imei")) || undefined}
            aria-describedby="imei-hint imei-error"
            className={fieldClass}
          />
          <FieldError id="imei-error" message={liveImeiError ?? errorFor("imei")} />
          <span id="imei-hint" className="text-xs text-muted">
            Dial *#06# to find it. Adding it earns a verified-IMEI badge; only the last 4 digits
            are shown publicly, and the full IMEI is kept for disputes.
          </span>
        </label>
      ) : null}

      <fieldset className="flex flex-col gap-3 text-sm">
        <legend className="mb-1">Where is the item?</legend>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            County
            <select
              name="county"
              required
              defaultValue={d?.county ?? ""}
              aria-invalid={Boolean(errorFor("county")) || undefined}
              className={fieldClass}
            >
              <option value="" disabled>
                Choose a county
              </option>
              {COUNTIES.map((county) => (
                <option key={county} value={county}>
                  {county}
                </option>
              ))}
            </select>
            <FieldError id="county-error" message={errorFor("county")} />
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

      <div className="flex flex-col gap-1.5 text-sm">
        <span>{mode === "create" ? "Photos" : "Add photos"}</span>
        <PhotoPicker
          max={Math.max(0, MAX_PHOTOS - existingPhotos.length + removedCount)}
          invalid={Boolean(errorFor("photos"))}
        />
        <FieldError id="photos-error" message={errorFor("photos")} />
      </div>

      {state.error ? (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
          {state.field ? " Everything else you entered is still here." : null}
        </p>
      ) : null}

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
