import { isFavoritesTrip } from "@/lib/favorites-trip";
import { formatMediaCountFromTrip, totalMediaCount } from "@/lib/media-count";
import type { Trip } from "@/lib/types";

export type PlaceSummary = {
  slug: string;
  title: string;
  location?: string;
  photoCount: number;
  mediaLabel: string;
  coverUrl: string | null;
};

export function buildPlacesGalleryList(trips: Trip[]): PlaceSummary[] {
  return trips
    .filter((trip) => !isFavoritesTrip(trip.name))
    .filter((trip) => totalMediaCount(trip) > 0)
    .map((trip) => ({
      slug: trip.name,
      title: trip.title,
      location: trip.location,
      photoCount: totalMediaCount(trip),
      mediaLabel: formatMediaCountFromTrip(trip),
      coverUrl: trip.coverUrl,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function placeGalleryPath(slug: string) {
  return `/gallery/places/${encodeURIComponent(slug)}`;
}
