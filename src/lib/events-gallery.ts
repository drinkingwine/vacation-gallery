import { isFavoritesTrip } from "@/lib/favorites-trip";
import { isEventAlbum, normalizeEventSlug } from "@/lib/event-kind";
import { totalMediaCount } from "@/lib/media-count";
import type { GalleryPhoto, Trip } from "@/lib/types";

export type EventSummary = {
  slug: string;
  label: string;
  tripName: string;
  photoCount: number;
  coverUrl: string | null;
};

export function buildEventsGalleryList(trips: Trip[]): Trip[] {
  return trips
    .filter(
      (trip) =>
        isEventAlbum(trip) &&
        !isFavoritesTrip(trip.name) &&
        totalMediaCount(trip) > 0,
    )
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function galleryPhotosForEvents(
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

export function findEventSummary(
  trips: Trip[],
  slug: string,
): EventSummary | undefined {
  const normalized = slug.trim().toLowerCase();
  const trip = buildEventsGalleryList(trips).find(
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

export function eventGalleryPath(slug: string) {
  return `/events/${encodeURIComponent(slug)}`;
}

export function eventGalleryPathForTrip(trip: Pick<Trip, "name">) {
  return eventGalleryPath(normalizeEventSlug(trip.name));
}
