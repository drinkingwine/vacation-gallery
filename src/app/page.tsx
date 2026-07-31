"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Heart, type LucideIcon } from "lucide-react";
import { CoverImage } from "@/components/gallery/CoverImage";
import { Spinner } from "@/components/gallery/Spinner";
import { useFooterConfig } from "@/components/footer-config";
import { useGalleryHomeSlice } from "@/hooks/use-gallery-home-cache";
import { useGalleryHomeInit } from "@/hooks/use-gallery-home-init";
import { isFavoritesTrip } from "@/lib/favorites-trip";
import { totalMediaCount } from "@/lib/media-count";
import { isVideo } from "@/lib/media";
import { prefetchMapDataWhenIdle } from "@/lib/map-data-cache";
import { mainNavItems } from "@/lib/nav-items";
import { cn } from "@/lib/utils";

const FAVORITES_HREF = "/gallery/favorites";

type HomeDestination = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const DESTINATION_BLURBS: Record<string, string> = {
  [FAVORITES_HREF]: "Saved photos and videos from across the collection.",
  "/gallery": "Browse trips and open albums by journey.",
  "/people": "Find photos tagged with the people in them.",
  "/places": "Explore the archive by destination.",
  "/things": "Jump into subjects, objects, and motifs.",
  "/stuff": "Odds and ends — wedding, Wheaton, and more.",
  "/timeline": "See trips laid out across the years.",
  "/map": "Pin geotagged photos on the world map.",
};

const HOME_DESTINATION_ORDER = [
  "/gallery",
  "/people",
  "/places",
  "/things",
  "/timeline",
  "/map",
  "/stuff",
] as const;

const homeDestinations: HomeDestination[] = [
  { label: "Favorites", href: FAVORITES_HREF, icon: Heart },
  ...HOME_DESTINATION_ORDER.map(
    (href) => mainNavItems.find((item) => item.href === href)!,
  ),
];

function uniqueCoverUrls(items: { coverUrl: string | null }[]): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (!item.coverUrl || seen.has(item.coverUrl)) continue;
    // Home cards should never use a video as the cover.
    if (isVideo(item.coverUrl)) continue;
    seen.add(item.coverUrl);
    urls.push(item.coverUrl);
  }
  return urls;
}

function pickRandomUrl(urls: string[]): string | null {
  if (urls.length === 0) return null;
  return urls[Math.floor(Math.random() * urls.length)]!;
}

/** Prefer an unused URL so cards don't all share the same photo. */
function takeRandomUrl(urls: string[], used: Set<string>): string | null {
  const available = urls.filter((url) => !used.has(url));
  const pick = pickRandomUrl(available.length > 0 ? available : urls);
  if (pick) used.add(pick);
  return pick;
}

function pickDestinationImages({
  trips,
  people,
  places,
  things,
  stuff,
}: {
  trips: { name: string; coverUrl: string | null }[];
  people: { coverUrl: string | null }[];
  places: { coverUrl: string | null }[];
  things: { coverUrl: string | null }[];
  stuff: { coverUrl: string | null }[];
}): Record<string, string | null> {
  const favoritesTrip = trips.find((trip) => isFavoritesTrip(trip.name));
  const vacationTrips = trips.filter((trip) => !isFavoritesTrip(trip.name));
  const tripCovers = uniqueCoverUrls(vacationTrips);
  const peopleCovers = uniqueCoverUrls(people);
  const placeCovers = uniqueCoverUrls(places);
  const thingCovers = uniqueCoverUrls(things);
  const stuffCovers = uniqueCoverUrls(stuff);
  const used = new Set<string>();

  const favoritesCover =
    favoritesTrip?.coverUrl && !isVideo(favoritesTrip.coverUrl)
      ? favoritesTrip.coverUrl
      : null;
  if (favoritesCover) used.add(favoritesCover);

  return {
    [FAVORITES_HREF]:
      favoritesCover ?? takeRandomUrl(tripCovers, used),
    "/gallery": takeRandomUrl(tripCovers, used),
    "/people": takeRandomUrl(
      peopleCovers.length > 0 ? peopleCovers : tripCovers,
      used,
    ),
    "/places": takeRandomUrl(
      placeCovers.length > 0 ? placeCovers : tripCovers,
      used,
    ),
    "/things": takeRandomUrl(
      thingCovers.length > 0 ? thingCovers : tripCovers,
      used,
    ),
    "/stuff": takeRandomUrl(
      stuffCovers.length > 0 ? stuffCovers : tripCovers,
      used,
    ),
    "/timeline": takeRandomUrl(tripCovers, used),
    "/map": takeRandomUrl(
      placeCovers.length > 0 ? placeCovers : tripCovers,
      used,
    ),
  };
}

function withImageCacheBust(url: string, bust: number): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${bust}`;
}

function DestinationCard({
  item,
  index,
  imageUrl,
}: {
  item: HomeDestination;
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
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
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
  const { value: trips, loading: tripsLoading } = useGalleryHomeSlice("trips", {
    force: true,
  });
  const { value: people, loading: peopleLoading } = useGalleryHomeSlice(
    "people",
    { force: true },
  );
  const { value: places, loading: placesLoading } = useGalleryHomeSlice(
    "places",
    { force: true },
  );
  const { value: things, loading: thingsLoading } = useGalleryHomeSlice(
    "things",
    { force: true },
  );
  const { value: stuff, loading: stuffLoading } = useGalleryHomeSlice(
    "stuff",
    { force: true },
  );
  const showLoading =
    homeLoading ||
    tripsLoading ||
    peopleLoading ||
    placesLoading ||
    thingsLoading ||
    stuffLoading;

  const [imageBust] = useState(() => Date.now());
  const [destinationImages, setDestinationImages] = useState<
    Record<string, string | null>
  >({});

  const vacationTrips = useMemo(
    () => trips.filter((trip) => !isFavoritesTrip(trip.name)),
    [trips],
  );

  useEffect(() => {
    if (showLoading) return;
    setDestinationImages(
      pickDestinationImages({ trips, people, places, things, stuff }),
    );
  }, [showLoading, trips, people, places, things, stuff]);

  useEffect(() => {
    if (showLoading) return;
    prefetchMapDataWhenIdle();
  }, [showLoading]);

  const totalMedia = vacationTrips.reduce(
    (sum, t) => sum + totalMediaCount(t),
    0,
  );

  useFooterConfig({
    stats: showLoading
      ? "Loading…"
      : `${totalMedia} item${totalMedia !== 1 ? "s" : ""} across ${vacationTrips.length} trip${vacationTrips.length !== 1 ? "s" : ""}`,
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {homeDestinations.map((item, index) => {
            const rawUrl = destinationImages[item.href] ?? null;
            return (
              <DestinationCard
                key={item.href}
                item={item}
                index={index}
                imageUrl={
                  rawUrl ? withImageCacheBust(rawUrl, imageBust) : null
                }
              />
            );
          })}
        </div>
      </section>
    </main>
  );
}
