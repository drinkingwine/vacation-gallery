import {
  inferCountryCodeFromText,
  resolveCountryCode,
} from "@/lib/geocode-address";
import type { Trip } from "@/lib/types";

const US_STATE =
  /^(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)$/i;

export function countryCodeToFlagEmoji(code: string): string {
  const upper = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return "🌐";

  return String.fromCodePoint(
    ...upper.split("").map((char) => 0x1f1e6 + char.charCodeAt(0) - 65),
  );
}

export function countryCodeFromTrip(
  trip: Pick<Trip, "location" | "geoLocation" | "title" | "name">,
): string | null {
  const candidates = [
    trip.location,
    trip.geoLocation,
    trip.title,
    trip.name,
  ].filter(Boolean);

  for (const text of candidates) {
    if (!text) continue;

    const segments = text
      .split(/[,;/_-]+/)
      .map((part) => part.trim())
      .filter(Boolean);

    for (let index = segments.length - 1; index >= 0; index--) {
      const segment = segments[index]!;
      if (US_STATE.test(segment)) return "US";
      const fromSegment = resolveCountryCode(segment);
      if (fromSegment) return fromSegment;
    }

    const fromText = inferCountryCodeFromText(text);
    if (fromText) return fromText;
  }

  return null;
}

export function countryCodeToName(code: string): string {
  const upper = code.trim().toUpperCase();
  if (upper === "US") return "US";

  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(upper) ?? upper;
  } catch {
    return upper;
  }
}

export function getTripCountryName(
  trip: Pick<Trip, "location" | "geoLocation" | "title" | "name">,
): string | null {
  const code = countryCodeFromTrip(trip);
  if (code) return countryCodeToName(code);

  const text = trip.location ?? trip.geoLocation;
  if (!text) return null;

  const segments = text
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return segments.at(-1) ?? null;
}

export function getTripCountryFlag(
  trip: Pick<Trip, "location" | "geoLocation" | "title" | "name">,
): string {
  const code = countryCodeFromTrip(trip);
  return code ? countryCodeToFlagEmoji(code) : "🌐";
}

export function getUniqueTripFlags(
  trips: Array<Pick<Trip, "location" | "geoLocation" | "title" | "name">>,
): string[] {
  const flags: string[] = [];
  const seen = new Set<string>();

  for (const trip of trips) {
    const code = countryCodeFromTrip(trip) ?? "unknown";
    if (seen.has(code)) continue;
    seen.add(code);
    flags.push(getTripCountryFlag(trip));
  }

  return flags;
}
