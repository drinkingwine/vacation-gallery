import { isNullIslandCoords } from "@/lib/reverse-geocode";
import type { Photo, Trip } from "@/lib/types";

export type RecentLocation = {
  location: string;
  geoLocation: string;
  latitude: number;
  longitude: number;
  usedAt: number;
};

type LocationCoords = {
  location: string;
  geoLocation: string;
  latitude: number;
  longitude: number;
};

const STORAGE_KEY = "gallery-recent-locations-v2";
const LEGACY_STORAGE_KEY = "gallery-recent-locations-v1";
const MAX_RECENT = 12;
/** Collapse nearby EXIF points from the same dive site / resort. */
const DEDUPE_RADIUS_METERS = 250;
const EARTH_RADIUS_METERS = 6_371_000;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function normalizeTripKey(tripName: string): string {
  return tripName.trim();
}

function normalizeLabel(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function isCoordinateLabel(label: string): boolean {
  return /^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(label.trim());
}

function placeLabelKey(entry: RecentLocation): string | null {
  const label =
    normalizeLabel(entry.location) || normalizeLabel(entry.geoLocation);
  if (!label || isCoordinateLabel(label)) return null;
  return label.toLowerCase().replace(/\s+/g, " ");
}

function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
}

function preferLocation(
  primary: RecentLocation,
  secondary: RecentLocation,
): RecentLocation {
  const primaryNamed = placeLabelKey(primary);
  const secondaryNamed = placeLabelKey(secondary);
  const named =
    primaryNamed && !secondaryNamed
      ? primary
      : secondaryNamed && !primaryNamed
        ? secondary
        : primaryNamed &&
            secondaryNamed &&
            secondary.location.length > primary.location.length
          ? secondary
          : primary;

  return {
    latitude: primary.latitude,
    longitude: primary.longitude,
    location: named.location,
    geoLocation: named.geoLocation,
    usedAt: Math.max(primary.usedAt, secondary.usedAt),
  };
}

function toRecentLocation(
  input: Pick<
    RecentLocation,
    "location" | "geoLocation" | "latitude" | "longitude"
  > & { usedAt?: number },
): RecentLocation | null {
  if (
    !Number.isFinite(input.latitude) ||
    !Number.isFinite(input.longitude) ||
    isNullIslandCoords(input.latitude, input.longitude)
  ) {
    return null;
  }

  const location =
    normalizeLabel(input.location) ||
    normalizeLabel(input.geoLocation) ||
    `${input.latitude.toFixed(5)}, ${input.longitude.toFixed(5)}`;
  const geoLocation = normalizeLabel(input.geoLocation) || location;

  return {
    location,
    geoLocation,
    latitude: input.latitude,
    longitude: input.longitude,
    usedAt: input.usedAt ?? Date.now(),
  };
}

function dedupeLocations(entries: RecentLocation[]): RecentLocation[] {
  const ordered = [...entries].sort((a, b) => b.usedAt - a.usedAt);
  const result: RecentLocation[] = [];

  for (const entry of ordered) {
    const label = placeLabelKey(entry);
    const matchIndex = result.findIndex((existing) => {
      if (label && placeLabelKey(existing) === label) return true;
      return (
        distanceMeters(
          entry.latitude,
          entry.longitude,
          existing.latitude,
          existing.longitude,
        ) <= DEDUPE_RADIUS_METERS
      );
    });

    if (matchIndex < 0) {
      result.push(entry);
      continue;
    }

    result[matchIndex] = preferLocation(result[matchIndex]!, entry);
  }

  return result.slice(0, MAX_RECENT);
}

function parseLocationList(raw: unknown): RecentLocation[] {
  if (!Array.isArray(raw)) return [];

  return dedupeLocations(
    raw
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const record = item as Partial<RecentLocation>;
        return toRecentLocation({
          location: typeof record.location === "string" ? record.location : "",
          geoLocation:
            typeof record.geoLocation === "string" ? record.geoLocation : "",
          latitude:
            typeof record.latitude === "number" ? record.latitude : Number.NaN,
          longitude:
            typeof record.longitude === "number"
              ? record.longitude
              : Number.NaN,
          usedAt: typeof record.usedAt === "number" ? record.usedAt : Date.now(),
        });
      })
      .filter((entry): entry is RecentLocation => entry != null)
      .sort((a, b) => b.usedAt - a.usedAt),
  ).slice(0, MAX_RECENT);
}

function readAllTripLocations(): Record<string, RecentLocation[]> {
  if (!isBrowser()) return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const result: Record<string, RecentLocation[]> = {};
    for (const [tripName, value] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      const key = normalizeTripKey(tripName);
      if (!key) continue;
      result[key] = parseLocationList(value);
    }
    return result;
  } catch {
    return {};
  }
}

function writeAllTripLocations(all: Record<string, RecentLocation[]>): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    // Drop the old global list once trip-scoped storage is in use.
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function readRecentLocations(tripName: string): RecentLocation[] {
  const key = normalizeTripKey(tripName);
  if (!key) return [];
  return readAllTripLocations()[key] ?? [];
}

export function rememberRecentLocation(
  tripName: string,
  input: LocationCoords,
): RecentLocation[] {
  const key = normalizeTripKey(tripName);
  if (!key) return [];

  const next = toRecentLocation({ ...input, usedAt: Date.now() });
  const all = readAllTripLocations();
  const existing = all[key] ?? [];

  if (!next) return existing;

  const merged = dedupeLocations([next, ...existing]).slice(0, MAX_RECENT);
  all[key] = merged;
  writeAllTripLocations(all);
  return merged;
}

/** Distinct geotagged places already used on trip photos (plus the trip default). */
export function locationsFromTripPhotos(
  photos: Photo[],
  trip?: Trip | null,
): RecentLocation[] {
  const fromPhotos = photos
    .map((photo, index) =>
      toRecentLocation({
        location: photo.location ?? "",
        geoLocation: photo.location ?? "",
        latitude:
          typeof photo.latitude === "number" ? photo.latitude : Number.NaN,
        longitude:
          typeof photo.longitude === "number" ? photo.longitude : Number.NaN,
        // Preserve encounter order as a soft recency signal.
        usedAt: photos.length - index,
      }),
    )
    .filter((entry): entry is RecentLocation => entry != null);

  const fromTrip =
    trip &&
    toRecentLocation({
      location: trip.location ?? trip.geoLocation ?? "",
      geoLocation: trip.geoLocation ?? trip.location ?? "",
      latitude: typeof trip.latitude === "number" ? trip.latitude : Number.NaN,
      longitude:
        typeof trip.longitude === "number" ? trip.longitude : Number.NaN,
      usedAt: photos.length + 1,
    });

  return dedupeLocations([
    ...(fromTrip ? [fromTrip] : []),
    ...fromPhotos,
  ]).slice(0, MAX_RECENT);
}

export function mergeRecentLocations(
  ...lists: RecentLocation[][]
): RecentLocation[] {
  return dedupeLocations(
    lists
      .flat()
      .sort((a, b) => b.usedAt - a.usedAt),
  ).slice(0, MAX_RECENT);
}

export function recentLocationMatches(
  entry: Pick<RecentLocation, "latitude" | "longitude" | "location" | "geoLocation">,
  latitude: number | null,
  longitude: number | null,
  locationLabel?: string | null,
): boolean {
  if (latitude == null || longitude == null) return false;

  const entryLabel = placeLabelKey(entry as RecentLocation);
  const selectedLabel = locationLabel
    ? placeLabelKey({
        location: locationLabel,
        geoLocation: locationLabel,
        latitude,
        longitude,
        usedAt: 0,
      })
    : null;

  if (entryLabel && selectedLabel && entryLabel === selectedLabel) {
    return true;
  }

  return (
    distanceMeters(entry.latitude, entry.longitude, latitude, longitude) <=
    DEDUPE_RADIUS_METERS
  );
}

export function recentLocationKey(entry: RecentLocation): string {
  const label = placeLabelKey(entry) ?? "coords";
  return `${label}:${entry.latitude.toFixed(3)},${entry.longitude.toFixed(3)}`;
}

export function toGeoLocatorResult(entry: RecentLocation): LocationCoords {
  return {
    location: entry.location,
    geoLocation: entry.geoLocation,
    latitude: entry.latitude,
    longitude: entry.longitude,
  };
}
