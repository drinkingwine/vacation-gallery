import {
  buildGalleryHomeViews,
  type GalleryHomeData,
  type GalleryHomePhoto,
} from "@/lib/gallery-home-data";
import { notifyGalleryHomeReady } from "@/lib/gallery-admin";
import type { Trip } from "@/lib/types";

const STORAGE_KEY = "gallery-home-cache-v14";

type GalleryHomeCacheEntry = {
  trips: Trip[];
  photos: GalleryHomePhoto[];
  views: GalleryHomeData;
};

let cache: GalleryHomeCacheEntry | null = null;
let inflight: Promise<GalleryHomeData> | null = null;
let inflightIsForce = false;

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

export function getCachedStuff() {
  return getCachedGalleryHome()?.stuff ?? null;
}

export function getCachedEvents() {
  return getCachedGalleryHome()?.events ?? null;
}

export function invalidateGalleryHomeCache(): void {
  cache = null;
  inflight = null;
  inflightIsForce = false;
  clearStoredCache();
}

export function rerandomizeGalleryHomeCovers(): GalleryHomeData | null {
  const entry = hydrateCacheFromStorage();
  if (!entry) return null;
  return commitCache(buildCacheEntry(entry.trips, entry.photos));
}

async function fetchGalleryHome(options?: {
  force?: boolean;
}): Promise<GalleryHomeData> {
  const url = options?.force
    ? "/api/gallery/home?fresh=1"
    : "/api/gallery/home";
  const res = await fetch(url, { cache: "no-store" });
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
  const force = options?.force ?? false;

  if (force) {
    cache = null;
    clearStoredCache();
    if (inflight && inflightIsForce) return inflight;
  } else {
    const existing = hydrateCacheFromStorage();
    if (existing) return existing.views;
    if (inflight) return inflight;
  }

  inflightIsForce = force;
  inflight = fetchGalleryHome({ force }).finally(() => {
    inflight = null;
    inflightIsForce = false;
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

export async function loadStuff(options?: { force?: boolean }) {
  const data = await loadGalleryHome(options);
  return data.stuff;
}

export async function loadEvents(options?: { force?: boolean }) {
  const data = await loadGalleryHome(options);
  return data.events;
}

/** Re-roll cover images from cached photos, or fetch if no cache yet. */
export async function refreshGalleryHomeRandomized(): Promise<GalleryHomeData> {
  const data = await loadGalleryHome();
  rerandomizeGalleryHomeCovers();
  return getCachedGalleryHome() ?? data;
}

/** Re-roll covers without blocking — updates sessionStorage when done. */
export function rerandomizeGalleryHomeCoversInBackground(): void {
  void Promise.resolve().then(() => {
    rerandomizeGalleryHomeCovers();
  });
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
