import { isFavoritesTrip } from "@/lib/favorites-trip";
import { isStuffEvent, normalizeEventSlug } from "@/lib/event-kind";
import { totalMediaCount } from "@/lib/media-count";
import type { GalleryPhoto, Trip } from "@/lib/types";

export type StuffSummary = {
  slug: string;
  label: string;
  tripName: string;
  photoCount: number;
  coverUrl: string | null;
};

export { normalizeEventSlug };

export function buildStuffGalleryList(trips: Trip[]): Trip[] {
  return trips
    .filter(
      (trip) =>
        isStuffEvent(trip) &&
        !isFavoritesTrip(trip.name) &&
        totalMediaCount(trip) > 0,
    )
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function galleryPhotosForStuff(
  photos: GalleryPhoto[],
  tripName?: string,
): GalleryPhoto[] {
  const normalized = tripName?.trim() ?? "";
  return photos.filter((photo) => {
    if (isFavoritesTrip(photo.tripName)) return false;
    if (!normalized) return true;
    return photo.tripName === normalized;
  });
}

export function findStuffSummary(
  trips: Trip[],
  slug: string,
): StuffSummary | undefined {
  const normalized = slug.trim().toLowerCase();
  const trip = buildStuffGalleryList(trips).find(
    (item) => normalizeEventSlug(item.name) === normalized,
  );
  if (!trip) return undefined;
  return {
    slug: normalized,
    label: trip.title,
    tripName: trip.name,
    photoCount: totalMediaCount(trip),
    coverUrl: trip.coverUrl,
  };
}

export function stuffGalleryPath(slug: string) {
  return `/stuff/${encodeURIComponent(slug)}`;
}

export function stuffGalleryPathForTrip(trip: Pick<Trip, "name">) {
  return stuffGalleryPath(normalizeEventSlug(trip.name));
}
