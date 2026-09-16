"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Header menu: toggles on click, closes on outside click, Escape, or following a link. */
export function Dropdown({
  label,
  children,
  ariaLabel,
  align = "right",
  buttonClassName = "",
  panelClassName = "",
}: {
  label: ReactNode;
  children: ReactNode;
  ariaLabel?: string;
  align?: "left" | "right";
  buttonClassName?: string;
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className={buttonClassName}
      >
        {label}
      </button>
      {open ? (
        <div
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("a")) setOpen(false);
          }}
          className={`absolute top-full z-50 mt-2 overflow-hidden rounded-xl border border-border bg-surface text-sm shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          } ${panelClassName}`}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
