"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { CloseIcon, ImagePlusIcon } from "@/components/icons";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 8 * 1024 * 1024;

type Picked = { file: File; url: string };

/**
 * Photo picker for the sell and edit forms: previews, remove buttons, and
 * drag and drop. The picked files are written back into a real
 * <input name="photos">, so the form submits them like any other field.
 * Type and size are checked here to save a wasted upload; the server
 * checks again (listing-data.ts).
 */
export function PhotoPicker({ max, invalid }: { max: number; invalid?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  // Keep the form's file input in step with what's shown.
  useEffect(() => {
    if (!inputRef.current) return;
    const transfer = new DataTransfer();
    for (const { file } of picked) transfer.items.add(file);
    inputRef.current.files = transfer.files;
  }, [picked]);

  // Release the preview URLs when the form goes away.
  const pickedRef = useRef(picked);
  useEffect(() => {
    pickedRef.current = picked;
  }, [picked]);
  useEffect(() => () => pickedRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  function add(files: FileList | null) {
    if (!files) return;
    const room = max - picked.length;
    const wrongType = [...files].filter((f) => !ACCEPTED.includes(f.type));
    const tooBig = [...files].filter((f) => ACCEPTED.includes(f.type) && f.size > MAX_BYTES);
    const usable = [...files].filter((f) => ACCEPTED.includes(f.type) && f.size <= MAX_BYTES);
    const taken = usable.slice(0, Math.max(0, room));

    const problems = [
      wrongType.length ? `${wrongType.length} not a JPG, PNG or WebP` : null,
      tooBig.length ? `${tooBig.length} larger than 8 MB` : null,
      usable.length > taken.length ? `only ${max} photos allowed` : null,
    ].filter(Boolean);
    setNotice(problems.length ? `Skipped: ${problems.join(", ")}.` : null);
    if (taken.length) {
      setPicked((current) => [...current, ...taken.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
    }
  }

  function remove(index: number) {
    setPicked((current) => {
      URL.revokeObjectURL(current[index].url);
      return current.filter((_, i) => i !== index);
    });
    setNotice(null);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    add(event.dataTransfer.files);
  }

  const full = picked.length >= max;

  return (
    <div
      // Show keyboard focus on the whole picker; the real input is invisible.
      className="rounded-xl has-[#photos:focus-visible]:ring-2 has-[#photos:focus-visible]:ring-highlight has-[#photos:focus-visible]:ring-offset-2"
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      {/* Visually hidden but still the real, focusable form field. */}
      <input
        ref={inputRef}
        id="photos"
        name="photos"
        type="file"
        accept={ACCEPTED.join(",")}
        multiple
        aria-invalid={invalid || undefined}
        aria-describedby="photos-hint"
        onChange={(event) => {
          add(event.target.files);
          // The effect above writes the full set back into this input.
        }}
        className="sr-only"
      />

      {picked.length === 0 ? (
        <label
          htmlFor="photos"
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center ${
            dragging
              ? "border-highlight bg-highlight-soft"
              : invalid
                ? "border-danger"
                : "border-border bg-surface hover:border-foreground"
          }`}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-highlight-soft text-highlight">
            <ImagePlusIcon className="h-6 w-6" />
          </span>
          <span className="font-semibold">Add photos</span>
          <span className="text-xs text-muted">
            Tap to choose from your gallery or camera
            <span className="hidden sm:inline">, or drag them here</span>
          </span>
        </label>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {picked.map((p, i) => (
            <li key={p.url} className="relative aspect-square overflow-hidden rounded-lg border border-border bg-tile">
              {/* Local object URL: next/image can't optimise it and needn't. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
              {i === 0 ? (
                <span className="absolute bottom-1 left-1 rounded bg-foreground/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Cover
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute top-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-surface/90 shadow"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </li>
          ))}
          {!full ? (
            <li>
              <label
                htmlFor="photos"
                className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs text-muted ${
                  dragging ? "border-highlight bg-highlight-soft" : "border-border hover:border-foreground"
                }`}
              >
                <ImagePlusIcon className="h-6 w-6 text-highlight" />
                Add more
              </label>
            </li>
          ) : null}
        </ul>
      )}

      <p id="photos-hint" className="mt-2 flex justify-between gap-3 text-xs text-muted">
        <span>First photo is the cover. Resized, with location data removed, before saving.</span>
        <span className="shrink-0">
          {picked.length}/{max}
        </span>
      </p>
      {notice ? (
        <p role="status" className="mt-1 text-xs text-danger">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
