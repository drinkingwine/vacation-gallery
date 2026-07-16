"use client";

import { useCallback, useEffect, useState } from "react";
import {
  GALLERY_HOME_READY_EVENT,
  GALLERY_REFRESH_EVENT,
} from "@/lib/gallery-admin";
import {
  getCachedGalleryHomePhotos,
  loadGalleryHome,
} from "@/lib/gallery-home-cache";
import { buildTaggedHeroSlides, type HomeHeroSlide } from "@/lib/hero-images";
import { cn } from "@/lib/utils";

export function HomeHero() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [heroSlides, setHeroSlides] = useState<HomeHeroSlide[]>([]);

  const syncHeroSlides = useCallback(() => {
    const photos = getCachedGalleryHomePhotos() ?? [];
    setHeroSlides(buildTaggedHeroSlides(photos));
  }, []);

  useEffect(() => {
    syncHeroSlides();
    void loadGalleryHome().finally(syncHeroSlides);
    window.addEventListener(GALLERY_HOME_READY_EVENT, syncHeroSlides);
    window.addEventListener(GALLERY_REFRESH_EVENT, syncHeroSlides);
    return () => {
      window.removeEventListener(GALLERY_HOME_READY_EVENT, syncHeroSlides);
      window.removeEventListener(GALLERY_REFRESH_EVENT, syncHeroSlides);
    };
  }, [syncHeroSlides]);

  const safeIndex = heroSlides.length ? activeIndex % heroSlides.length : 0;
  const activeSlide = heroSlides[safeIndex] ?? null;
  const canNavigate = heroSlides.length > 1;
  const metaLine = [activeSlide?.location, activeSlide?.date]
    .filter(Boolean)
    .join(" · ");

  const scrollPrev = () => {
    setActiveIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  const scrollNext = () => {
    setActiveIndex((prev) => (prev + 1) % heroSlides.length);
  };

  useEffect(() => {
    setActiveIndex(0);
  }, [heroSlides]);

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % heroSlides.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [heroSlides.length]);

  return (
    <section className="front-fade-up group relative hidden w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900 md:block">
      <div className="relative min-h-[100svh] w-full">
        {heroSlides.map((slide, index) => (
          <div
            key={`${slide.src}-${index}`}
            className={cn(
              "absolute inset-0 transition-opacity",
              index === safeIndex ? "opacity-100" : "opacity-0",
            )}
            style={{ transitionDuration: "1200ms" }}
          >
            <div
              aria-hidden
              className="absolute inset-0 scale-110 bg-cover bg-center blur-3xl brightness-75"
              style={{ backgroundImage: `url(${slide.src})` }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.src}
              alt=""
              className="absolute inset-0 h-full w-full object-contain object-center"
              loading={index === 0 ? "eager" : "lazy"}
              decoding="async"
            />
          </div>
        ))}

        {activeSlide ? (
          <>
            <div className="pointer-events-none absolute inset-0 z-[15] bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 z-20 flex items-end px-4 pb-20 pt-24 sm:px-8 sm:pb-24 md:px-12">
              <div className="max-w-3xl space-y-2 text-white">
                <h2 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
                  {activeSlide.tripTitle}
                </h2>
                {metaLine ? (
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/70 sm:text-sm">
                    {metaLine}
                  </p>
                ) : null}
              </div>
            </div>
          </>
        ) : null}

        {canNavigate && (
          <div className="pointer-events-none absolute inset-0 z-10">
            <div className="group/edge-left pointer-events-auto absolute inset-y-0 left-0 flex w-[18%] min-w-[56px] max-w-[88px] items-center justify-start px-2 sm:px-4">
              <button
                type="button"
                onClick={scrollPrev}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white opacity-100 backdrop-blur transition hover:bg-white/20 hover:text-white sm:h-12 sm:w-12 md:opacity-0 md:group-hover/edge-left:opacity-100"
                aria-label="Previous slide"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            </div>
            <div className="group/edge-right pointer-events-auto absolute inset-y-0 right-0 flex w-[18%] min-w-[56px] max-w-[88px] items-center justify-end px-2 sm:px-4">
              <button
                type="button"
                onClick={scrollNext}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white opacity-100 backdrop-blur transition hover:bg-white/20 hover:text-white sm:h-12 sm:w-12 md:opacity-0 md:group-hover/edge-right:opacity-100"
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
          <div className="absolute bottom-6 right-4 z-20 flex gap-2 sm:bottom-10 sm:right-10">
            {heroSlides.map((_, index) => (
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
      </div>
    </section>
  );
}
