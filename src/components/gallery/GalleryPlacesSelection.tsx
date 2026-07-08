"use client";

import { PlaceCard } from "@/components/gallery/PlaceCard";
import { useGalleryHomeSlice } from "@/hooks/use-gallery-home-cache";
import { galleryCopy } from "@/lib/gallery-copy";
import { cn } from "@/lib/utils";

export function GalleryPlacesSelection() {
  const { value: places, loading } = useGalleryHomeSlice("places");

  return (
    <div className="gallery-page-shell flex flex-1 flex-col">
        <main className="page-container main-offset mx-auto flex-1 px-0 pb-16">
          <div className="space-y-10">
            <header className="front-fade-up space-y-4">
              <h1
                className={cn(
                  "font-serif",
                  "text-4xl font-semibold text-zinc-800/90 dark:text-white/85 md:text-5xl",
                )}
              >
                Places
              </h1>
            </header>

            {loading ? (
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
                {Array.from({ length: 10 }).map((_, index) => (
                  <div
                    key={index}
                    className="aspect-video animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-600"
                  />
                ))}
              </div>
            ) : places.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white/60 p-10 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
                {galleryCopy.places.empty}
              </div>
            ) : (
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
                {places.map((place, index) => (
                  <PlaceCard
                    key={place.slug}
                    place={place}
                    priority={index < 6}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
  );
}
