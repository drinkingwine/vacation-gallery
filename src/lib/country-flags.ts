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
  trip: Pick<Trip, "location" | "geoLocation">,
): string | null {
  const candidates = [trip.location, trip.geoLocation].filter(Boolean);

  for (const text of candidates) {
    if (!text) continue;

    const segments = text
      .split(/[,;]+/)
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

export function getTripCountryFlag(
  trip: Pick<Trip, "location" | "geoLocation">,
): string {
  const code = countryCodeFromTrip(trip);
  return code ? countryCodeToFlagEmoji(code) : "🌐";
}
