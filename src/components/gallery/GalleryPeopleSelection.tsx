"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { PersonCard } from "@/components/gallery/PersonCard";
import { galleryCopy } from "@/lib/gallery-copy";
import type { PersonSummary } from "@/lib/people-gallery";
import { cn } from "@/lib/utils";

export function GalleryPeopleSelection() {
  const [people, setPeople] = useState<PersonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPeople = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/gallery/people");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { people: PersonSummary[] };
      setPeople(data.people);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load people");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  return (
    <>
      <Header />

      <div className="gallery-page-shell flex flex-1 flex-col">
        <main className="page-container main-offset mx-auto flex-1 px-0 pb-16">
          <div className="space-y-10">
            <header className="front-fade-up space-y-4">
              <p className="text-xs uppercase tracking-[0.4em] text-zinc-600/80 dark:text-white/60">
                {galleryCopy.people.eyebrow}
              </p>
              <h1
                className={cn(
                  "font-serif",
                  "text-4xl font-semibold text-zinc-800/90 dark:text-white/85 md:text-5xl",
                )}
              >
                {galleryCopy.people.title}
              </h1>
              <p className="max-w-2xl text-sm text-zinc-600/80 dark:text-white/60">
                {galleryCopy.people.description}
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
                  onClick={fetchPeople}
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
            ) : people.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white/60 p-10 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
                {galleryCopy.people.empty}
              </div>
            ) : (
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                {people.map((person) => (
                  <PersonCard key={person.tag} person={person} />
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
