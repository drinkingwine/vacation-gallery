import type { GalleryHomePhoto } from "@/lib/gallery-home-data";
import type { Trip } from "@/lib/types";

const TTL_MS = 5 * 60 * 1000;

export type GalleryHomeServerPayload = {
  trips: Trip[];
  photos: GalleryHomePhoto[];
};

type CacheEntry = {
  at: number;
  data: GalleryHomeServerPayload;
};

let cache: CacheEntry | null = null;
let inflight: Promise<GalleryHomeServerPayload> | null = null;

export function invalidateGalleryHomeServerCache(): void {
  cache = null;
  inflight = null;
}

async function fetchGalleryHomePayload(): Promise<GalleryHomeServerPayload> {
  const { loadGalleryHomeData } = await import("@/lib/github");
  const { trips, photos } = await loadGalleryHomeData();

  return {
    trips,
    photos: photos.map((photo) => ({
      downloadUrl: photo.downloadUrl,
      mediaType: photo.mediaType,
      tags: photo.tags,
      tripName: photo.tripName,
      tripTitle: photo.tripTitle,
      tripLocation: photo.tripLocation,
      location: photo.location,
      dateTaken: photo.dateTaken,
    })),
  };
}

export async function getGalleryHomeServerPayload(): Promise<GalleryHomeServerPayload> {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return cache.data;
  }

  if (inflight) return inflight;

  inflight = fetchGalleryHomePayload()
    .then((data) => {
      cache = { at: Date.now(), data };
      return data;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}
