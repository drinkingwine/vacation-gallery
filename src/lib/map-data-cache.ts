import type { MapLocationMarker } from "@/lib/map";

export type MapPhotoData = {
  locations: MapLocationMarker[];
  photoCount: number;
  locationCount: number;
};

let cache: MapPhotoData | null = null;
let inflight: Promise<MapPhotoData> | null = null;

export function getCachedMapData(): MapPhotoData | null {
  return cache;
}

export function invalidateMapData(): void {
  cache = null;
  inflight = null;
}

async function fetchMapData(): Promise<MapPhotoData> {
  const res = await fetch("/api/map/photos");
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }

  const data = (await res.json()) as MapPhotoData;
  cache = data;
  return data;
}

export async function loadMapData(options?: { force?: boolean }): Promise<MapPhotoData> {
  if (options?.force) {
    cache = null;
  } else if (cache) {
    return cache;
  }

  if (inflight) return inflight;

  inflight = fetchMapData().finally(() => {
    inflight = null;
  });

  return inflight;
}

export function prefetchMapData(): void {
  if (cache || inflight) return;
  void loadMapData();
}

export function prefetchMapDataWhenIdle(): void {
  if (typeof window === "undefined") return;

  const run = () => prefetchMapData();
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 4000 });
  } else {
    setTimeout(run, 1500);
  }
}
