"use client";

import { useEffect, useRef, useState, type TouchEvent } from "react";
import Image from "next/image";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  ExpandIcon,
} from "@/components/icons";

type Photo = { id: string; url: string };

function ArrowButton({
  direction,
  onClick,
  onDark = false,
}: {
  direction: "prev" | "next";
  onClick: () => void;
  onDark?: boolean;
}) {
  const Icon = direction === "prev" ? ChevronLeftIcon : ChevronRightIcon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "prev" ? "Previous photo" : "Next photo"}
      className={`absolute top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full shadow-sm ${
        direction === "prev" ? "left-3" : "right-3"
      } ${onDark ? "bg-white/15 text-white hover:bg-white/25" : "bg-surface/90 text-foreground hover:bg-surface"}`}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

/** Main photo with thumbnails, plus a full-screen viewer (native <dialog>). */
export function ListingGallery({ photos, title }: { photos: Photo[]; title: string }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchStartX = useRef<number | null>(null);

  // Keep the <dialog> and page scrolling in sync with `open`.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  if (photos.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-border bg-surface text-muted">
        No photo
      </div>
    );
  }

  const count = photos.length;
  const photo = photos[index];
  const show = (next: number) => setIndex((next + count) % count);
  const alt = `${title}, photo ${index + 1} of ${count}`;

  const swipe = {
    onTouchStart: (event: TouchEvent) => {
      touchStartX.current = event.touches[0].clientX;
    },
    onTouchEnd: (event: TouchEvent) => {
      if (touchStartX.current === null || count < 2) return;
      const dx = event.changedTouches[0].clientX - touchStartX.current;
      touchStartX.current = null;
      if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    },
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        {...swipe}
        className="relative aspect-square w-full overflow-hidden rounded-xl border border-border bg-surface"
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`View photo ${index + 1} of ${count} full screen`}
          className="absolute inset-0 cursor-zoom-in"
        >
          <Image
            key={photo.id}
            src={photo.url}
            alt={alt}
            fill
            loading="eager"
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-contain p-6"
          />
        </button>
        {count > 1 ? (
          <>
            <ArrowButton direction="prev" onClick={() => show(index - 1)} />
            <ArrowButton direction="next" onClick={() => show(index + 1)} />
            <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-foreground/75 px-2.5 py-1 text-xs font-medium text-white">
              {index + 1} / {count}
            </span>
          </>
        ) : null}
        <span className="pointer-events-none absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-medium shadow-sm">
          <ExpandIcon className="h-3.5 w-3.5" />
          View full size
        </span>
      </div>

      {count > 1 ? (
        <div className="grid grid-cols-5 gap-2">
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => show(i)}
              aria-label={`Show photo ${i + 1} of ${count}`}
              aria-current={i === index ? "true" : undefined}
              className={`relative aspect-square overflow-hidden rounded-lg border-2 bg-surface ${
                i === index ? "border-foreground" : "border-border hover:border-muted"
              }`}
            >
              <Image
                src={p.url}
                alt=""
                fill
                sizes="(max-width: 1024px) 20vw, 100px"
                className="object-contain p-1"
              />
            </button>
          ))}
        </div>
      ) : null}

      <dialog
        ref={dialogRef}
        aria-label={`${title}: photos`}
        onClose={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") show(index + 1);
          if (event.key === "ArrowLeft") show(index - 1);
        }}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-neutral-950 p-0 backdrop:bg-black"
      >
        {open ? (
          <div {...swipe} className="flex h-full w-full flex-col text-white">
            <div className="flex items-center justify-between px-4 py-3 text-sm">
              <span>
                {index + 1} / {count}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close full-screen photos"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="relative flex-1">
              <Image
                key={photo.id}
                src={photo.url}
                alt={alt}
                fill
                sizes="100vw"
                className="object-contain"
              />
              {count > 1 ? (
                <>
                  <ArrowButton direction="prev" onClick={() => show(index - 1)} onDark />
                  <ArrowButton direction="next" onClick={() => show(index + 1)} onDark />
                </>
              ) : null}
            </div>

            {count > 1 ? (
              <div className="flex justify-center gap-2 overflow-x-auto px-4 py-4">
                {photos.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => show(i)}
                    aria-label={`Show photo ${i + 1} of ${count}`}
                    aria-current={i === index ? "true" : undefined}
                    className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 bg-white ${
                      i === index ? "border-white" : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <Image src={p.url} alt="" fill sizes="56px" className="object-contain p-0.5" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </dialog>
    </div>
  );
}
