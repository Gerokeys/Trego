"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PauseIcon,
  PlayIcon,
} from "@/components/icons";

export type HeroSlide = {
  title: string;
  body: string;
  cta: { label: string; href: string };
  images: { src: string; alt: string }[];
};

const INTERVAL_MS = 7000;

const controlClass =
  "flex h-8 w-8 items-center justify-center rounded-full bg-surface text-foreground shadow-sm hover:bg-background";

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // Only fade on slide changes, so the first slide appears instantly on load.
  const [hasChanged, setHasChanged] = useState(false);

  const show = (next: number) => {
    setHasChanged(true);
    setIndex((next + slides.length) % slides.length);
  };

  useEffect(() => {
    // Never auto-advance for people who asked for reduced motion.
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setHasChanged(true);
      setIndex((i) => (i + 1) % slides.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused, slides.length]);

  const slide = slides[index];

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured"
      className="relative overflow-hidden rounded-2xl bg-highlight-soft"
    >
      <div
        key={index}
        aria-roledescription="slide"
        aria-label={`${index + 1} of ${slides.length}`}
        className={`grid items-center gap-8 px-6 pt-8 pb-20 sm:px-12 sm:pt-12 lg:grid-cols-[1fr_auto] lg:pb-16 ${
          hasChanged ? "motion-safe:animate-fade-in" : ""
        }`}
      >
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {slide.title}
          </h2>
          <p className="mt-3 text-muted">{slide.body}</p>
          <Link
            href={slide.cta.href}
            className="mt-6 inline-block rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground hover:opacity-90"
          >
            {slide.cta.label}
          </Link>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:gap-3 lg:w-136">
          {slide.images.map((image) => (
            <div
              key={image.src}
              className="relative aspect-3/4 overflow-hidden rounded-xl bg-surface"
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                loading="eager"
                sizes="(max-width: 1024px) 25vw, 136px"
                className="object-contain p-2"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-5 flex items-center justify-between px-6 sm:px-12">
        <div className="flex items-center gap-2">
          {slides.map((s, i) => (
            <button
              key={s.title}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => show(i)}
              className={`h-2 rounded-full transition-all ${
                i === index ? "w-6 bg-accent" : "w-2 bg-accent/25 hover:bg-accent/50"
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Previous slide" onClick={() => show(index - 1)} className={controlClass}>
            <ChevronLeftIcon />
          </button>
          <button type="button" aria-label="Next slide" onClick={() => show(index + 1)} className={controlClass}>
            <ChevronRightIcon />
          </button>
          <button
            type="button"
            aria-label={paused ? "Play slideshow" : "Pause slideshow"}
            onClick={() => setPaused((p) => !p)}
            className={controlClass}
          >
            {paused ? <PlayIcon /> : <PauseIcon />}
          </button>
        </div>
      </div>
    </section>
  );
}
