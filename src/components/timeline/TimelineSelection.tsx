"use client";

import { TripTimeline } from "@/components/timeline/TripTimeline";
import { useGalleryHomeSlice } from "@/hooks/use-gallery-home-cache";
import { cn } from "@/lib/utils";

export function TimelineSelection() {
  const { value: trips, loading } = useGalleryHomeSlice("trips");

  return (
    <div className="gallery-page-shell flex flex-1 flex-col">
      <main className="page-container main-offset mx-auto flex-1 px-0 pb-16">
        <div className="space-y-10">
          <header className="front-fade-up">
            <h1
              className={cn(
                "font-serif",
                "text-4xl font-semibold text-zinc-800/90 dark:text-white/85 md:text-5xl",
              )}
            >
              Timeline
            </h1>
          </header>

          {loading ? (
            <div className="space-y-8">
              <div className="h-56 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-700" />
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-40 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-700"
                />
              ))}
            </div>
          ) : (
            <TripTimeline trips={trips} />
          )}
        </div>
      </main>
    </div>
  );
}
