import {
  buildGalleryHomeViews,
  type GalleryHomeData,
  type GalleryHomePhoto,
} from "@/lib/gallery-home-data";
import { notifyGalleryHomeReady } from "@/lib/gallery-admin";
import type { Trip } from "@/lib/types";
import type { PersonSummary } from "@/lib/people-gallery";
import type { PlaceSummary } from "@/lib/places-gallery";

const STORAGE_KEY = "gallery-home-cache";

let cache: GalleryHomeData | null = null;
let inflight: Promise<GalleryHomeData> | null = null;

function readStoredCache(): GalleryHomeData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GalleryHomeData;
  } catch {
    return null;
  }
}

function writeStoredCache(data: GalleryHomeData): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore quota or serialization errors.
  }
}

function clearStoredCache(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

function hydrateCacheFromStorage(): GalleryHomeData | null {
  if (cache) return cache;
  cache = readStoredCache();
  return cache;
}

export function getCachedGalleryHome(): GalleryHomeData | null {
  return hydrateCacheFromStorage();
}

export function getCachedTrips(): Trip[] | null {
  return cache?.trips ?? null;
}

export function getCachedPeople(): PersonSummary[] | null {
  return cache?.people ?? null;
}

export function getCachedPlaces(): PlaceSummary[] | null {
  return cache?.places ?? null;
}

export function invalidateGalleryHomeCache(): void {
  cache = null;
  inflight = null;
  clearStoredCache();
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

  const data = buildGalleryHomeViews(payload.trips, payload.photos);
  cache = data;
  writeStoredCache(data);
  notifyGalleryHomeReady();
  return data;
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
    if (existing) return existing;
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

export async function loadPeople(options?: {
  force?: boolean;
}): Promise<PersonSummary[]> {
  const data = await loadGalleryHome(options);
  return data.people;
}

export async function loadPlaces(options?: {
  force?: boolean;
}): Promise<PlaceSummary[]> {
  const data = await loadGalleryHome(options);
  return data.places;
}

export async function refreshGalleryHomeRandomized(): Promise<GalleryHomeData> {
  return loadGalleryHome({ force: true });
}

export function prefetchGalleryHome(): void {
  if (cache || inflight) return;
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
