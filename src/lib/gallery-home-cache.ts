import {
  buildGalleryHomeViews,
  type GalleryHomeData,
  type GalleryHomePhoto,
} from "@/lib/gallery-home-data";
import { notifyGalleryHomeReady } from "@/lib/gallery-admin";
import type { Trip } from "@/lib/types";

const STORAGE_KEY = "gallery-home-cache-v22";

type GalleryHomeCacheEntry = {
  identity: string;
  trips: Trip[];
  photos: GalleryHomePhoto[];
  views: GalleryHomeData;
};

let cache: GalleryHomeCacheEntry | null = null;
let inflight: Promise<GalleryHomeData> | null = null;
/** Bumped on invalidate/force so stale in-flight fetches cannot repopulate cache. */
let cacheGeneration = 0;
let viewerIdentity = "anon";

function readStoredCache(): GalleryHomeCacheEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GalleryHomeCacheEntry;
    if (!parsed || parsed.identity !== viewerIdentity) {
      clearStoredCache();
      return null;
    }
    return parsed;
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
  if (cache) {
    if (cache.identity !== viewerIdentity) {
      cache = null;
    } else {
      return cache;
    }
  }
  cache = readStoredCache();
  return cache;
}

function buildCacheEntry(
  trips: Trip[],
  photos: GalleryHomePhoto[],
): GalleryHomeCacheEntry {
  return {
    identity: viewerIdentity,
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

/** Bind cache to the current session identity; clears on change. */
export function setGalleryHomeViewerIdentity(identity: string): void {
  const next = identity || "anon";
  if (next === viewerIdentity) return;
  viewerIdentity = next;
  invalidateGalleryHomeCache();
}

export function getGalleryHomeViewerIdentity(): string {
  return viewerIdentity;
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
  cacheGeneration += 1;
  cache = null;
  inflight = null;
  clearStoredCache();
}

/** Merge fields onto a trip already in the home cache (e.g. right after edit). */
export function patchCachedGalleryTrip(
  tripName: string,
  patch: Partial<Trip>,
): GalleryHomeData | null {
  const entry = hydrateCacheFromStorage();
  if (!entry) return null;

  const trips = entry.trips.map((trip) =>
    trip.name === tripName ? { ...trip, ...patch } : trip,
  );
  return commitCache(buildCacheEntry(trips, entry.photos));
}

export function rerandomizeGalleryHomeCovers(): GalleryHomeData | null {
  const entry = hydrateCacheFromStorage();
  if (!entry) return null;
  return commitCache(buildCacheEntry(entry.trips, entry.photos));
}

async function fetchGalleryHome(options: {
  force?: boolean;
  generation: number;
}): Promise<GalleryHomeData> {
  const url = options.force
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

  const entry = buildCacheEntry(payload.trips, payload.photos);

  // Superseded by a newer invalidate/force — keep newer cache if present.
  if (options.generation !== cacheGeneration) {
    return hydrateCacheFromStorage()?.views ?? entry.views;
  }

  return commitCache(entry);
}

export async function loadGalleryHome(options?: {
  force?: boolean;
}): Promise<GalleryHomeData> {
  const force = options?.force ?? false;

  if (!force) {
    const existing = hydrateCacheFromStorage();
    if (existing) return existing.views;
    if (inflight) return inflight;
  } else {
    cacheGeneration += 1;
    cache = null;
    clearStoredCache();
    // Never reuse an older in-flight request — it belongs to a prior generation
    // and will refuse to commit, leaving the UI with an empty trips list.
    inflight = null;
  }

  const generation = cacheGeneration;
  const request = fetchGalleryHome({ force, generation }).finally(() => {
    if (inflight === request) {
      inflight = null;
    }
  });
  inflight = request;
  return request;
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
