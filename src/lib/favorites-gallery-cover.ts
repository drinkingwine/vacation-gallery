import { FAVORITES_TRIP_NAME, isFavoritesTrip } from "@/lib/favorites-trip";
import { pickRandomImageCoverUrl } from "@/lib/gallery-cover-random";
import type { Photo, Trip } from "@/lib/types";

export async function withRandomFavoritesCover(trips: Trip[]): Promise<Trip[]> {
  const favoritesIndex = trips.findIndex((trip) => isFavoritesTrip(trip.name));
  if (favoritesIndex === -1) return trips;

  try {
    const res = await fetch(
      `/api/photos?trip=${encodeURIComponent(FAVORITES_TRIP_NAME)}`,
    );
    if (!res.ok) return trips;

    const photos = (await res.json()) as Photo[];
    const coverUrl = pickRandomImageCoverUrl(photos);
    if (!coverUrl) return trips;

    return trips.map((trip, index) =>
      index === favoritesIndex ? { ...trip, coverUrl } : trip,
    );
  } catch {
    return trips;
  }
}
