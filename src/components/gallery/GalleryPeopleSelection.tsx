"use client";

import { useCallback, useEffect, useState } from "react";
import { PersonCard } from "@/components/gallery/PersonCard";
import { galleryCopy } from "@/lib/gallery-copy";
import {
  peopleListCache,
} from "@/lib/gallery-lists-cache";
import { GALLERY_REFRESH_EVENT } from "@/lib/gallery-admin";
import type { PersonSummary } from "@/lib/people-gallery";
import { cn } from "@/lib/utils";

const skeletonClass =
  "aspect-video animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-600";

export function GalleryPeopleSelection() {
  const cached = peopleListCache.get();
  const [people, setPeople] = useState<PersonSummary[]>(() => cached ?? []);
  const [loading, setLoading] = useState(() => !cached);
  const [error, setError] = useState<string | null>(null);

  const fetchPeople = useCallback(async (force = false) => {
    if (!force && !peopleListCache.get()) {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await peopleListCache.load(force ? { force: true } : undefined);
      setPeople(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load people");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPeople();
  }, [fetchPeople]);

  useEffect(() => {
    const refresh = () => {
      void fetchPeople(true);
    };
    window.addEventListener(GALLERY_REFRESH_EVENT, refresh);
    return () => window.removeEventListener(GALLERY_REFRESH_EVENT, refresh);
  }, [fetchPeople]);

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
                People
              </h1>
            </header>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => void fetchPeople(true)}
                  className="mt-2 underline"
                >
                  Retry
                </button>
              </div>
            ) : null}

            {loading ? (
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                {Array.from({ length: 10 }).map((_, index) => (
                  <div key={index} className={skeletonClass} />
                ))}
              </div>
            ) : people.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white/60 p-10 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
                {galleryCopy.people.empty}
              </div>
            ) : (
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                {people.map((person, index) => (
                  <PersonCard
                    key={person.tag}
                    person={person}
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
