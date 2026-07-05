"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { cn } from "@/lib/utils";
import type { GalleryItem } from "@/lib/gallery";

const Gallery25 = dynamic(
  () =>
    import("@/components/gallery/Gallery25").then((mod) => ({
      default: mod.Gallery25,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[4/5] animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800"
          />
        ))}
      </div>
    ),
  },
);

type FavoritesGalleryPageProps = {
  items: GalleryItem[];
};

export function FavoritesGalleryPage({ items }: FavoritesGalleryPageProps) {
  return (
    <>
      <Header backHref="/gallery" backLabel="All albums" />

      <div className="gallery-page-shell flex flex-1 flex-col">
        <main className="page-container main-offset mx-auto flex-1 space-y-8 px-0 pb-16">
          <header className="front-fade-up space-y-3">
            <h1
              className={cn(
                "font-serif text-4xl font-semibold text-zinc-800/90 dark:text-white/85 md:text-5xl",
              )}
            >
              Favorites
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Photos marked with a favorite tag across all trips.
            </p>
            <Link
              href="/gallery/all"
              className="inline-flex text-xs uppercase tracking-[0.25em] text-zinc-500 transition hover:text-zinc-900 dark:text-white/50 dark:hover:text-white"
            >
              Browse all photos →
            </Link>
          </header>

          {items.length === 0 ? (
            <div className="rounded-2xl border border-rose-200/70 bg-white/70 p-12 text-center dark:border-rose-500/20 dark:bg-zinc-900/60">
              <p className="text-lg text-zinc-700 dark:text-zinc-200">
                No favorites yet
              </p>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Open a photo, view image details, and add a favorite tag.
              </p>
            </div>
          ) : (
            <Gallery25 items={items} showHeader={false} showChrome={false} />
          )}
        </main>

        <Footer />
      </div>
    </>
  );
}
