"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MAX_HERO_IMAGES } from "@/lib/hero-images";
import { cn } from "@/lib/utils";

export type GalleryAlbumHeroBadge = {
  label: string;
  className?: string;
};

type GalleryAlbumHeroProps = {
  images: string[];
  title: string;
  eyebrow?: string;
  badges?: GalleryAlbumHeroBadge[];
  subtitle?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  className?: string;
  /** Skip the full-bleed hero image; show the compact title block only. */
  compact?: boolean;
};

const HERO_INTERVAL_MS = 6500;

function CompactAlbumHeader({
  title,
  eyebrow,
  badges = [],
  subtitle,
  description,
}: Pick<
  GalleryAlbumHeroProps,
  "title" | "eyebrow" | "badges" | "subtitle" | "description"
>) {
  return (
    <header className="space-y-2">
      {eyebrow ? (
        <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-500 dark:text-zinc-400">
          {eyebrow}
        </p>
      ) : null}
      {badges.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {badges.map((badge) => (
            <span
              key={badge.label}
              className={cn(
                "rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
                badge.className,
              )}
            >
              {badge.label}
            </span>
          ))}
        </div>
      ) : null}
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {title}
      </h1>
      {description ? (
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          {description}
        </p>
      ) : null}
      {subtitle ? (
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}

export function GalleryAlbumHero({
  images,
  title,
  eyebrow,
  badges = [],
  subtitle,
  description,
  backHref,
  backLabel,
  className,
  compact = false,
}: GalleryAlbumHeroProps) {
  const heroImages = useMemo(
    () => images.filter(Boolean).slice(0, MAX_HERO_IMAGES),
    [images],
  );
  const [heroIndex, setHeroIndex] = useState(0);
  const safeHeroIndex = heroImages.length ? heroIndex % heroImages.length : 0;

  useEffect(() => {
    setHeroIndex(0);
  }, [heroImages]);

  useEffect(() => {
    if (compact || heroImages.length <= 1) return;
    const timer = window.setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroImages.length);
    }, HERO_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [compact, heroImages.length]);

  return (
    <div className={cn("space-y-4", className)}>
      {!compact ? (
        <section className="front-fade-up relative mx-auto hidden h-[65vh] min-h-[420px] max-h-[900px] overflow-hidden rounded-[32px] bg-zinc-100 shadow-2xl shadow-black/10 dark:bg-zinc-900 md:block md:h-[78vh] md:min-h-[560px]">
          {heroImages.length > 0 ? (
            heroImages.map((src, index) => (
              <div
                key={`${src}-${index}`}
                className={cn(
                  "absolute inset-0 transition-opacity",
                  index === safeHeroIndex ? "opacity-100" : "opacity-0",
                )}
                style={{ transitionDuration: "1200ms" }}
              >
                <div
                  aria-hidden
                  className="absolute inset-0 scale-110 bg-cover bg-center blur-3xl brightness-75"
                  style={{ backgroundImage: `url(${src})` }}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  className="absolute inset-0 h-full w-full object-contain object-center"
                  loading={index === 0 ? "eager" : "lazy"}
                  decoding="async"
                />
              </div>
            ))
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-rose-400 via-violet-500 to-teal-500 dark:from-indigo-800 dark:via-purple-900 dark:to-teal-900" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-transparent" />

          {heroImages.length > 1 ? (
            <div className="absolute bottom-6 right-4 z-20 flex gap-2 sm:bottom-10 sm:right-10">
              {heroImages.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setHeroIndex(index)}
                  className={cn(
                    "h-0.5 transition-all",
                    index === safeHeroIndex ? "w-8 bg-white" : "w-4 bg-white/30",
                  )}
                  aria-label={`Slide ${index + 1}`}
                />
              ))}
            </div>
          ) : null}

          <div className="absolute inset-0 flex items-end px-4 pb-8 pt-20 sm:px-6 sm:pb-10 sm:pt-24 md:px-12 md:pb-14">
            <div className="w-full space-y-4 text-white sm:space-y-6">
              {eyebrow ? (
                <p className="text-[10px] uppercase tracking-[0.4em] text-white/70">
                  {eyebrow}
                </p>
              ) : null}
              {badges.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {badges.map((badge) => (
                    <span
                      key={badge.label}
                      className={cn(
                        "rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80 backdrop-blur-md",
                        badge.className,
                      )}
                    >
                      {badge.label}
                    </span>
                  ))}
                </div>
              ) : null}
              <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl md:text-6xl lg:text-7xl">
                {title}
              </h1>
              {description ? (
                <p className="max-w-2xl text-sm font-light leading-relaxed text-white/70 md:text-lg">
                  {description}
                </p>
              ) : null}
              {subtitle ? (
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/60">
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <div className={cn(!compact && "md:hidden")}>
        <CompactAlbumHeader
          title={title}
          eyebrow={eyebrow}
          badges={badges}
          subtitle={subtitle}
          description={description}
        />
      </div>

      {backHref && backLabel ? (
        <Link
          href={backHref}
          className="inline-flex text-xs uppercase tracking-[0.25em] text-zinc-500 transition hover:text-zinc-900 dark:text-white/50 dark:hover:text-white"
        >
          ← {backLabel}
        </Link>
      ) : null}
    </div>
  );
}
