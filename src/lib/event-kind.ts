import { isFavoritesTrip } from "@/lib/favorites-trip";

export type EventKind = "trip" | "stuff";

export const EVENT_KIND_OPTIONS = [
  { value: "trip", label: "Trip" },
  { value: "stuff", label: "Stuff" },
] as const;

export function parseEventKind(value: unknown): EventKind | undefined {
  if (value === "trip" || value === "stuff") return value;
  // Legacy albums saved as "event" fold into Stuff.
  if (value === "event") return "stuff";
  return undefined;
}

/** Missing/unknown kind defaults to trip. Favorites is always a trip. */
export function getEventKind(trip: {
  kind?: EventKind | string | null;
  name?: string;
}): EventKind {
  if (trip.name && isFavoritesTrip(trip.name)) return "trip";
  return parseEventKind(trip.kind) ?? "trip";
}

export function isStuffEvent(trip: {
  kind?: EventKind | string | null;
  name?: string;
}): boolean {
  return getEventKind(trip) === "stuff";
}

export function isTripEvent(trip: {
  kind?: EventKind | string | null;
  name?: string;
}): boolean {
  return getEventKind(trip) === "trip";
}

/** Normalize a folder name to a URL slug (keeps year). */
export function normalizeEventSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
