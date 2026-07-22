import { isFavoritesTrip } from "@/lib/favorites-trip";
import { isStuffEvent, normalizeEventSlug } from "@/lib/event-kind";
import { totalMediaCount } from "@/lib/media-count";
import { tripLabel } from "@/lib/trip-meta";
import type { GalleryPhoto, Trip } from "@/lib/types";

export type StuffSummary = {
  slug: string;
  label: string;
  tripName: string;
  photoCount: number;
  coverUrl: string | null;
};

export { normalizeEventSlug };

export function buildStuffGalleryList(trips: Trip[]): StuffSummary[] {
  return trips
    .filter(
      (trip) =>
        isStuffEvent(trip) &&
        !isFavoritesTrip(trip.name) &&
        totalMediaCount(trip) > 0,
    )
    .map((trip) => ({
      slug: normalizeEventSlug(trip.name),
      label: trip.title?.trim() || tripLabel(trip.name),
      tripName: trip.name,
      photoCount: totalMediaCount(trip),
      coverUrl: trip.coverUrl,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
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
  return buildStuffGalleryList(trips).find(
    (item) => item.slug === slug.trim().toLowerCase(),
  );
}

export function stuffGalleryPath(slug: string) {
  return `/stuff/${encodeURIComponent(slug)}`;
}
