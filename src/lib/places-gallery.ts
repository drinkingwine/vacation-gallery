import { isFavoritesTrip } from "@/lib/favorites-trip";
import { pickRandomImageCoverUrl } from "@/lib/gallery-cover-random";
import { totalMediaCount } from "@/lib/media-count";
import { tripLabel } from "@/lib/trip-meta";
import type { GalleryPhoto, Trip } from "@/lib/types";

export type PlaceSummary = {
  slug: string;
  title: string;
  location?: string;
  tripCount: number;
  tripTitles: string[];
  photoCount: number;
  mediaLabel: string;
  coverUrl: string | null;
};

/** Strip trailing year/date suffixes from trip folder names for place grouping. */
export function getPlaceNameBase(name: string): string {
  return name
    .trim()
    .replace(/\s*\([^)]*\)\s*$/u, "")
    .replace(/[-_](?:\d{2}|\d{4})$/u, "")
    .trim();
}

export function getPlaceSlugFromTripName(name: string): string {
  const base = getPlaceNameBase(name);
  return base
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function tripBelongsToPlace(trip: Pick<Trip, "name">, placeSlug: string) {
  return getPlaceSlugFromTripName(trip.name) === placeSlug;
}

function formatCombinedMediaLabel(trips: Trip[]): string {
  const photoCount = trips.reduce((sum, trip) => sum + trip.photoCount, 0);
  const videoCount = trips.reduce(
    (sum, trip) => sum + (trip.videoCount ?? 0),
    0,
  );

  if (photoCount && videoCount) {
    return `${photoCount} photo${photoCount !== 1 ? "s" : ""}, ${videoCount} video${videoCount !== 1 ? "s" : ""}`;
  }
  if (videoCount) {
    return `${videoCount} video${videoCount !== 1 ? "s" : ""}`;
  }
  return `${photoCount} photo${photoCount !== 1 ? "s" : ""}`;
}

function pickPlaceCover(trips: Trip[]): string | null {
  const sorted = [...trips].sort((a, b) => {
    const aDate = a.startDate ? new Date(a.startDate).getTime() : 0;
    const bDate = b.startDate ? new Date(b.startDate).getTime() : 0;
    return bDate - aDate;
  });

  for (const trip of sorted) {
    if (trip.coverUrl) return trip.coverUrl;
  }
  return null;
}

function placeTitleFromTrips(trips: Trip[]): string {
  const bases = trips.map((trip) => getPlaceNameBase(trip.name));
  const titled = bases.find((base) => /[A-Z]/.test(base));
  return tripLabel(titled ?? bases[0] ?? trips[0].name);
}

function pickRandomPlaceCover(
  placeSlug: string,
  photos: GalleryPhoto[],
): string | null {
  const placePhotos = photos.filter(
    (photo) => getPlaceSlugFromTripName(photo.tripName) === placeSlug,
  );
  return pickRandomImageCoverUrl(placePhotos);
}

export function buildPlacesGalleryList(
  trips: Trip[],
  options?: { randomCovers?: boolean; photos?: GalleryPhoto[] },
): PlaceSummary[] {
  const groups = new Map<string, Trip[]>();

  for (const trip of trips) {
    if (isFavoritesTrip(trip.name) || totalMediaCount(trip) === 0) continue;

    const slug = getPlaceSlugFromTripName(trip.name);
    if (!slug) continue;

    const existing = groups.get(slug) ?? [];
    existing.push(trip);
    groups.set(slug, existing);
  }

  return Array.from(groups.entries())
    .map(([slug, groupedTrips]) => {
      const sortedTrips = [...groupedTrips].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      const photoCount = sortedTrips.reduce(
        (sum, trip) => sum + totalMediaCount(trip),
        0,
      );
      const tripLabel =
        sortedTrips.length > 1
          ? `${sortedTrips.length} trips, ${formatCombinedMediaLabel(sortedTrips)}`
          : formatCombinedMediaLabel(sortedTrips);

      return {
        slug,
        title: placeTitleFromTrips(sortedTrips),
        location:
          sortedTrips.find((trip) => trip.location)?.location ??
          sortedTrips[0].location,
        tripCount: sortedTrips.length,
        tripTitles: sortedTrips.map((trip) => trip.title),
        photoCount,
        mediaLabel: tripLabel,
        coverUrl:
          options?.randomCovers && options.photos
            ? pickRandomPlaceCover(slug, options.photos)
            : pickPlaceCover(sortedTrips),
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function findPlaceSummary(
  trips: Trip[],
  placeSlug: string,
): PlaceSummary | undefined {
  return buildPlacesGalleryList(trips).find((place) => place.slug === placeSlug);
}

export function placeGalleryPath(slug: string) {
  return `/places/${encodeURIComponent(slug)}`;
}
