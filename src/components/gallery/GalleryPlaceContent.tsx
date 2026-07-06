import Link from "next/link";
import { GalleryInfinite } from "@/components/gallery/GalleryInfinite";
import { buildGalleryItems } from "@/lib/gallery";
import {
  paginateGalleryPhotos,
  sortGalleryPhotos,
} from "@/lib/gallery-query";
import { galleryCopy } from "@/lib/gallery-copy";
import { getTrip, listPhotos } from "@/lib/github";
import { formatMediaCountFromTrip } from "@/lib/media-count";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 24;

type GalleryPlaceContentProps = {
  tripSlug: string;
};

export async function GalleryPlaceContent({ tripSlug }: GalleryPlaceContentProps) {
  const trip = await getTrip(tripSlug);
  if (!trip) {
    return null;
  }

  const tripPhotos = await listPhotos(tripSlug);
  const galleryPhotos = tripPhotos.map((photo) => ({
    ...photo,
    id: photo.path,
    tripName: trip.name,
    tripTitle: trip.title,
    tripLocation: trip.location,
    tripStartDate: trip.startDate,
  }));
  const filtered = sortGalleryPhotos(galleryPhotos, "newest");
  const { items: pagePhotos, hasNext } = paginateGalleryPhotos(
    filtered,
    1,
    PAGE_SIZE,
  );
  const items = buildGalleryItems(pagePhotos);

  return (
    <div className="space-y-8">
      <header className="front-fade-up space-y-4">
        <p className="text-xs uppercase tracking-[0.4em] text-zinc-600/80 dark:text-white/60">
          {galleryCopy.places.eyebrow}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1
            className={cn(
              "font-serif",
              "text-4xl font-semibold text-zinc-800/90 dark:text-white/85 md:text-5xl",
            )}
          >
            {trip.title}
          </h1>
          <span
            className={cn(
              "rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-900",
              "dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-100",
            )}
          >
            {formatMediaCountFromTrip(trip)}
          </span>
        </div>
        {trip.location ? (
          <p className="text-sm text-zinc-600/80 dark:text-white/60">
            {trip.location}
          </p>
        ) : null}
        <Link
          href="/gallery/places"
          className="inline-flex text-xs uppercase tracking-[0.25em] text-zinc-500 transition hover:text-zinc-900 dark:text-white/50 dark:hover:text-white"
        >
          ← All places
        </Link>
      </header>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white/60 p-10 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
          {galleryCopy.places.noPhotos(trip.title)}
        </div>
      ) : (
        <GalleryInfinite
          initialItems={items}
          initialPage={1}
          pageSize={PAGE_SIZE}
          hasNext={hasNext}
          trip={tripSlug}
        />
      )}
    </div>
  );
}
