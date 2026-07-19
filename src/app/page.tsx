"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CoverImage } from "@/components/gallery/CoverImage";
import { Spinner } from "@/components/gallery/Spinner";
import { useFooterConfig } from "@/components/footer-config";
import { useGalleryHomeSlice } from "@/hooks/use-gallery-home-cache";
import { useGalleryHomeInit } from "@/hooks/use-gallery-home-init";
import { totalMediaCount } from "@/lib/media-count";
import { prefetchMapDataWhenIdle } from "@/lib/map-data-cache";
import { mainNavItems, type MainNavItem } from "@/lib/nav-items";
import { cn } from "@/lib/utils";

const DESTINATION_BLURBS: Record<string, string> = {
  "/gallery": "Browse trips and open albums by journey.",
  "/people": "Find photos tagged with the people in them.",
  "/places": "Explore the archive by destination.",
  "/things": "Jump into subjects, objects, and motifs.",
  "/timeline": "See trips laid out across the years.",
  "/map": "Pin geotagged photos on the world map.",
};

const homeDestinations = mainNavItems.filter((item) => item.href !== "/");

function uniqueCoverUrls(items: { coverUrl: string | null }[]): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (!item.coverUrl || seen.has(item.coverUrl)) continue;
    seen.add(item.coverUrl);
    urls.push(item.coverUrl);
  }
  return urls;
}

function pickDestinationImages({
  trips,
  people,
  places,
  things,
}: {
  trips: { coverUrl: string | null }[];
  people: { coverUrl: string | null }[];
  places: { coverUrl: string | null }[];
  things: { coverUrl: string | null }[];
}): Record<string, string | null> {
  const tripCovers = uniqueCoverUrls(trips);
  const peopleCovers = uniqueCoverUrls(people);
  const placeCovers = uniqueCoverUrls(places);
  const thingCovers = uniqueCoverUrls(things);

  return {
    "/gallery": tripCovers[0] ?? null,
    "/people": peopleCovers[0] ?? tripCovers[1] ?? tripCovers[0] ?? null,
    "/places": placeCovers[0] ?? tripCovers[2] ?? tripCovers[0] ?? null,
    "/things": thingCovers[0] ?? tripCovers[3] ?? tripCovers[0] ?? null,
    "/timeline": tripCovers[1] ?? tripCovers[0] ?? null,
    "/map": placeCovers[1] ?? tripCovers[2] ?? placeCovers[0] ?? tripCovers[0] ?? null,
  };
}

function DestinationCard({
  item,
  index,
  imageUrl,
}: {
  item: MainNavItem;
  index: number;
  imageUrl: string | null;
}) {
  const blurb = DESTINATION_BLURBS[item.href] ?? `Open ${item.label}`;

  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex min-h-[300px] flex-col overflow-hidden rounded-3xl border border-zinc-200/80 shadow-sm transition duration-300",
        "hover:-translate-y-1 hover:border-zinc-300 hover:shadow-md",
        "dark:border-zinc-700/80 dark:hover:border-zinc-600",
        "gallery-card-enter",
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="absolute inset-0 bg-zinc-200 dark:bg-zinc-800">
        {imageUrl ? (
          <CoverImage
            src={imageUrl}
            alt=""
            unoptimized
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-linear-to-br from-zinc-300 via-zinc-200 to-sky-200 dark:from-zinc-800 dark:via-zinc-900 dark:to-teal-950" />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-zinc-950/85 via-zinc-950/35 to-zinc-950/10" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col justify-end gap-3 p-5 text-white">
        <div className="space-y-2">
          <h2 className="font-serif text-2xl font-semibold tracking-tight">
            {item.label}
          </h2>
          <p className="text-sm leading-relaxed text-white/75">{blurb}</p>
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60 transition group-hover:text-white">
          Open →
        </span>
      </div>
    </Link>
  );
}

export default function Home() {
  const { loading: homeLoading, error, retry: retryHome } = useGalleryHomeInit();
  const { value: trips, loading: tripsLoading } = useGalleryHomeSlice("trips");
  const { value: people, loading: peopleLoading } = useGalleryHomeSlice("people");
  const { value: places, loading: placesLoading } = useGalleryHomeSlice("places");
  const { value: things, loading: thingsLoading } = useGalleryHomeSlice("things");
  const showLoading =
    homeLoading || tripsLoading || peopleLoading || placesLoading || thingsLoading;

  const destinationImages = pickDestinationImages({
    trips,
    people,
    places,
    things,
  });

  useEffect(() => {
    if (showLoading) return;
    prefetchMapDataWhenIdle();
  }, [showLoading]);

  const totalMedia = trips.reduce((sum, t) => sum + totalMediaCount(t), 0);

  useFooterConfig({
    stats: showLoading
      ? "Loading…"
      : `${totalMedia} item${totalMedia !== 1 ? "s" : ""} across ${trips.length} trip${trips.length !== 1 ? "s" : ""}`,
  });

  return (
    <main className="relative flex-1 overflow-x-hidden">
      {showLoading ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-50/85 backdrop-blur-sm dark:bg-zinc-950/85"
          role="status"
          aria-live="polite"
          aria-label="Loading gallery"
        >
          <div className="flex flex-col items-center gap-3">
            <Spinner size="lg" />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Loading gallery…
            </p>
          </div>
        </div>
      ) : null}

      {/* Temporarily disabled home scrolling hero — restore <HomeHero /> when ready.
      <HomeHero />
      */}

      {error ? (
        <div className="mx-auto page-container px-0 pt-8">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            <p className="text-sm font-medium">Failed to load gallery data</p>
            <p className="mt-1 text-sm opacity-80">{error}</p>
            <button
              type="button"
              onClick={() => void retryHome()}
              className="mt-2 text-sm underline"
            >
              Retry
            </button>
          </div>
        </div>
      ) : null}

      <section className="front-fade-up page-container mx-auto space-y-10 px-4 pb-16 pt-(--home-header-offset) sm:px-0 sm:pb-20">
        <header className="relative max-w-2xl">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-8 -top-10 h-32 w-32 rounded-full bg-rose-200/40 blur-3xl dark:bg-violet-500/15"
          />
          <h1 className="relative font-serif text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-5xl">
            Where to next?
          </h1>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {homeDestinations.map((item, index) => (
            <DestinationCard
              key={item.href}
              item={item}
              index={index}
              imageUrl={destinationImages[item.href] ?? null}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
