"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const HERO_IMAGES_DESKTOP = [
  "/hero-desktop.png",
  "/hero1.jpg",
  "/hero2.jpg",
  "/hero3.jpg",
  "/hero4.jpg",
];

const HERO_IMAGES_MOBILE = [
  "/hero-mobile.png",
  "/hero1.jpg",
  "/hero2.jpg",
  "/hero3.jpg",
  "/hero4.jpg",
];

type HomeHeroProps = {
  primaryHref?: string;
  secondaryHref?: string;
};

export function HomeHero({
  primaryHref = "/gallery",
  secondaryHref = "/#trips",
}: HomeHeroProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);

  const heroImages = useMemo(() => {
    if (viewportWidth > 0 && viewportWidth < 640) {
      return HERO_IMAGES_MOBILE;
    }
    return HERO_IMAGES_DESKTOP;
  }, [viewportWidth]);

  const safeIndex = heroImages.length ? activeIndex % heroImages.length : 0;
  const canNavigate = heroImages.length > 1;

  const scrollPrev = () => {
    setActiveIndex((prev) => (prev - 1 + heroImages.length) % heroImages.length);
  };

  const scrollNext = () => {
    setActiveIndex((prev) => (prev + 1) % heroImages.length);
  };

  useEffect(() => {
    const updateSize = () => setViewportWidth(window.innerWidth);
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [heroImages]);

  useEffect(() => {
    if (heroImages.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % heroImages.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [heroImages.length]);

  const heroPrimaryClass =
    "inline-flex h-11 items-center rounded-full border border-white/20 bg-white/10 px-8 text-sm font-medium text-white backdrop-blur-md transition-all hover:scale-105 hover:bg-white/20";
  const heroSecondaryClass =
    "inline-flex h-11 items-center rounded-full border border-white/20 px-8 text-sm font-medium text-white backdrop-blur-md transition-all hover:scale-105 hover:bg-white/10";

  return (
    <section className="front-fade-up group relative -mt-24 min-h-[calc(100svh+6rem)] w-screen -ml-[calc(50vw-50%)] overflow-hidden bg-zinc-950">
      {heroImages.map((src, index) => (
        <div
          key={src}
          className={cn(
            "absolute inset-0 bg-cover bg-center transition-opacity md:bg-fixed",
            index === safeIndex ? "opacity-100" : "opacity-0",
          )}
          style={{
            backgroundImage: `url(${src})`,
            transitionDuration: "1200ms",
          }}
        />
      ))}

      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/15 to-black/45" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />

      {canNavigate && (
        <div className="pointer-events-none absolute inset-0 z-10">
          <div className="group/edge-left pointer-events-auto absolute inset-y-0 left-0 flex w-[20%] min-w-[72px] items-center justify-start px-4">
            <button
              type="button"
              onClick={scrollPrev}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white opacity-0 backdrop-blur transition hover:bg-white/20 hover:text-white group-hover/edge-left:opacity-100"
              aria-label="Previous slide"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          </div>
          <div className="group/edge-right pointer-events-auto absolute inset-y-0 right-0 flex w-[20%] min-w-[72px] items-center justify-end px-4">
            <button
              type="button"
              onClick={scrollNext}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white opacity-0 backdrop-blur transition hover:bg-white/20 hover:text-white group-hover/edge-right:opacity-100"
              aria-label="Next slide"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {canNavigate && (
        <div className="absolute bottom-10 right-10 z-20 flex gap-2">
          {heroImages.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={cn(
                "h-0.5 transition-all",
                index === safeIndex ? "w-8 bg-white" : "w-4 bg-white/30",
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      <div className="relative z-20 flex min-h-[calc(100svh+6rem)] flex-col items-start justify-start px-8 pb-16 pt-32 md:px-16 md:pt-36">
        <div className="max-w-2xl space-y-6 text-left">
          <p className="text-xs uppercase tracking-[0.4em] text-white/60">
            Vacation / Vision
          </p>
          <h1 className="font-serif text-4xl font-semibold leading-tight text-white/85 md:text-6xl lg:text-7xl">
            VACATION
            <br />
            VISION
          </h1>
          <p className="max-w-xl text-sm text-white/60 md:text-base">
            Fuse immersive light with minimalist layout, turning every frame into
            a collectible memory of travel.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href={primaryHref} className={heroPrimaryClass}>
              Enter gallery
            </Link>
            <Link href={secondaryHref} className={heroSecondaryClass}>
              Browse portfolio
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
