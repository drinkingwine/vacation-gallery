import type { Photo, Trip } from "@/lib/types";

const STORAGE_VERSION = "v1";
const STORAGE_PREFIX = `trip-page-cache:${STORAGE_VERSION}:`;

type TripPageData = {
  trip: Trip;
  photos: Photo[];
  at: number;
};

const memory = new Map<string, TripPageData>();

function storageKey(tripName: string) {
  return `${STORAGE_PREFIX}${tripName}`;
}

function readStorage(tripName: string): TripPageData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey(tripName));
    if (!raw) return null;
    return JSON.parse(raw) as TripPageData;
  } catch {
    return null;
  }
}

function writeStorage(tripName: string, data: TripPageData) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(storageKey(tripName), JSON.stringify(data));
  } catch {
    // Ignore quota errors.
  }
}

function removeStorage(tripName: string) {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(storageKey(tripName));
}

function persist(tripName: string, data: TripPageData) {
  memory.set(tripName, data);
  writeStorage(tripName, data);
}

export function getCachedTripPage(tripName: string): TripPageData | null {
  const cached = memory.get(tripName) ?? readStorage(tripName);
  if (!cached) return null;
  if (!memory.has(tripName)) {
    memory.set(tripName, cached);
  }
  return cached;
}

export function setCachedTripPage(
  tripName: string,
  trip: Trip,
  photos: Photo[],
) {
  persist(tripName, { trip, photos, at: Date.now() });
}

export function patchCachedTripPhoto(
  tripName: string,
  photoPath: string,
  patch: Partial<Photo>,
) {
  const cached = getCachedTripPage(tripName);
  if (!cached) return;

  const photos = cached.photos.map((photo) =>
    photo.path === photoPath ? { ...photo, ...patch } : photo,
  );

  persist(tripName, {
    trip: cached.trip,
    photos,
    at: Date.now(),
  });
}

export function invalidateTripPageCache(tripName?: string) {
  if (tripName === undefined) {
    memory.clear();
    if (typeof window !== "undefined") {
      for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
        const key = sessionStorage.key(index);
        if (key?.startsWith(STORAGE_PREFIX)) {
          sessionStorage.removeItem(key);
        }
      }
    }
    return;
  }

  memory.delete(tripName);
  removeStorage(tripName);
}
