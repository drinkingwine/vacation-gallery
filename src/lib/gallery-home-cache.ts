import {
  buildGalleryHomeViews,
  type GalleryHomeData,
  type GalleryHomePhoto,
} from "@/lib/gallery-home-data";
import { notifyGalleryHomeReady } from "@/lib/gallery-admin";
import type { Trip } from "@/lib/types";

const STORAGE_KEY = "gallery-home-cache-v5";

type GalleryHomeCacheEntry = {
  trips: Trip[];
  photos: GalleryHomePhoto[];
  views: GalleryHomeData;
};

let cache: GalleryHomeCacheEntry | null = null;
let inflight: Promise<GalleryHomeData> | null = null;

function readStoredCache(): GalleryHomeCacheEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GalleryHomeCacheEntry;
  } catch {
    return null;
  }
}

function writeStoredCache(entry: GalleryHomeCacheEntry): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // Ignore quota or serialization errors.
  }
}

function clearStoredCache(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

function hydrateCacheFromStorage(): GalleryHomeCacheEntry | null {
  if (cache) return cache;
  cache = readStoredCache();
  return cache;
}

function buildCacheEntry(
  trips: Trip[],
  photos: GalleryHomePhoto[],
): GalleryHomeCacheEntry {
  return {
    trips,
    photos,
    views: buildGalleryHomeViews(trips, photos),
  };
}

function commitCache(entry: GalleryHomeCacheEntry): GalleryHomeData {
  cache = entry;
  writeStoredCache(entry);
  notifyGalleryHomeReady();
  return entry.views;
}

export function getCachedGalleryHome(): GalleryHomeData | null {
  return hydrateCacheFromStorage()?.views ?? null;
}

export function getCachedGalleryHomePhotos(): GalleryHomePhoto[] | null {
  return hydrateCacheFromStorage()?.photos ?? null;
}

export function getCachedTrips(): Trip[] | null {
  return getCachedGalleryHome()?.trips ?? null;
}

export function getCachedPeople() {
  return getCachedGalleryHome()?.people ?? null;
}

export function getCachedPlaces() {
  return getCachedGalleryHome()?.places ?? null;
}

export function getCachedThings() {
  return getCachedGalleryHome()?.things ?? null;
}

export function invalidateGalleryHomeCache(): void {
  cache = null;
  inflight = null;
  clearStoredCache();
}

export function rerandomizeGalleryHomeCovers(): GalleryHomeData | null {
  const entry = hydrateCacheFromStorage();
  if (!entry) return null;
  return commitCache(buildCacheEntry(entry.trips, entry.photos));
}

async function fetchGalleryHome(): Promise<GalleryHomeData> {
  const res = await fetch("/api/gallery/home");
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }

  const payload = (await res.json()) as {
    trips: Trip[];
    photos: GalleryHomePhoto[];
  };

  return commitCache(buildCacheEntry(payload.trips, payload.photos));
}

export async function loadGalleryHome(options?: {
  force?: boolean;
}): Promise<GalleryHomeData> {
  if (options?.force) {
    cache = null;
    inflight = null;
    clearStoredCache();
  } else {
    const existing = hydrateCacheFromStorage();
    if (existing) return existing.views;
  }

  if (inflight) return inflight;

  inflight = fetchGalleryHome().finally(() => {
    inflight = null;
  });

  return inflight;
}

export async function loadTrips(options?: { force?: boolean }): Promise<Trip[]> {
  const data = await loadGalleryHome(options);
  return data.trips;
}

export async function loadPeople(options?: { force?: boolean }) {
  const data = await loadGalleryHome(options);
  return data.people;
}

export async function loadPlaces(options?: { force?: boolean }) {
  const data = await loadGalleryHome(options);
  return data.places;
}

export async function loadThings(options?: { force?: boolean }) {
  const data = await loadGalleryHome(options);
  return data.things;
}

/** Re-roll cover images from cached photos, or fetch if no cache yet. */
export async function refreshGalleryHomeRandomized(): Promise<GalleryHomeData> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

  const rerandomized = rerandomizeGalleryHomeCovers();
  if (rerandomized) return rerandomized;
  return loadGalleryHome();
}

export function prefetchGalleryHome(): void {
  if (hydrateCacheFromStorage() || inflight) return;
  void loadGalleryHome();
}

export function prefetchGalleryHomeWhenIdle(): void {
  if (typeof window === "undefined") return;

  const run = () => prefetchGalleryHome();
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 2000 });
  } else {
    setTimeout(run, 500);
  }
}
