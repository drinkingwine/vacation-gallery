"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { PlaceCard } from "@/components/gallery/PlaceCard";
import { galleryCopy } from "@/lib/gallery-copy";
import type { PlaceSummary } from "@/lib/places-gallery";
import { cn } from "@/lib/utils";

export function GalleryPlacesSelection() {
  const [places, setPlaces] = useState<PlaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlaces = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/gallery/places");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { places: PlaceSummary[] };
      setPlaces(data.places);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load places");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  return (
    <>
      <Header />

      <div className="gallery-page-shell flex flex-1 flex-col">
        <main className="page-container main-offset mx-auto flex-1 px-0 pb-16">
          <div className="space-y-10">
            <header className="front-fade-up space-y-4">
              <p className="text-xs uppercase tracking-[0.4em] text-zinc-600/80 dark:text-white/60">
                {galleryCopy.places.eyebrow}
              </p>
              <h1
                className={cn(
                  "font-serif",
                  "text-4xl font-semibold text-zinc-800/90 dark:text-white/85 md:text-5xl",
                )}
              >
                {galleryCopy.places.title}
              </h1>
              <p className="max-w-2xl text-sm text-zinc-600/80 dark:text-white/60">
                {galleryCopy.places.description}
              </p>
              <Link
                href="/gallery"
                className="inline-flex text-xs uppercase tracking-[0.25em] text-zinc-500 transition hover:text-zinc-900 dark:text-white/50 dark:hover:text-white"
              >
                ← Back to trips
              </Link>
            </header>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={fetchPlaces}
                  className="mt-2 underline"
                >
                  Retry
                </button>
              </div>
            ) : null}

            {loading ? (
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                {Array.from({ length: 10 }).map((_, index) => (
                  <div
                    key={index}
                    className="aspect-video animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800"
                  />
                ))}
              </div>
            ) : places.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white/60 p-10 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
                {galleryCopy.places.empty}
              </div>
            ) : (
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                {places.map((place) => (
                  <PlaceCard key={place.slug} place={place} />
                ))}
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
