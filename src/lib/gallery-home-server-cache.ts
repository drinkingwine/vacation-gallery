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
/** Bumped on invalidate so stale in-flight fetches cannot repopulate cache. */
let cacheGeneration = 0;

export function invalidateGalleryHomeServerCache(): void {
  cacheGeneration += 1;
  cache = null;
  inflight = null;
}

async function fetchGalleryHomePayload(
  generation: number,
): Promise<GalleryHomeServerPayload> {
  const { loadGalleryHomeData } = await import("@/lib/github");
  const { trips, photos } = await loadGalleryHomeData();

  const data: GalleryHomeServerPayload = {
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

  if (generation !== cacheGeneration) {
    // Superseded — return newer cache when present, otherwise this payload.
    return cache?.data ?? data;
  }

  cache = { at: Date.now(), data };
  return data;
}

export async function getGalleryHomeServerPayload(): Promise<GalleryHomeServerPayload> {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return cache.data;
  }

  if (inflight) return inflight;

  const generation = cacheGeneration;
  const request = fetchGalleryHomePayload(generation).finally(() => {
    if (inflight === request) {
      inflight = null;
    }
  });
  inflight = request;
  return request;
}
