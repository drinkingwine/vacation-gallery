import type { PositionstackResult } from "@/lib/geocode-address";

export type KnownPlace = {
  /** Match aliases (lowercase). Any alias contained in / equal to the query wins. */
  aliases: string[];
  label: string;
  latitude: number;
  longitude: number;
};

/**
 * Curated pins for places geocoders often miss or shift
 * (overwater resorts, remote dive sites, etc.).
 */
export const KNOWN_PLACES: KnownPlace[] = [
  {
    aliases: [
      "sipadan kapalai dive resort",
      "sipadan-kapalai dive resort",
      "sipadan kapalai resort",
      "kapalai dive resort",
      "kapalai resort",
      "kapalai water village",
      "sipadan kapalai",
      "kapalai island",
      "kapalai",
    ],
    // https://www.google.com/maps/place/4°13'35.0"N+118°41'01.7"E
    label: "Sipadan Kapalai Dive Resort, Sabah, Malaysia",
    latitude: 4.2264,
    longitude: 118.6838,
  },
  {
    aliases: [
      "barracuda point sipadan",
      "barracuda point",
      "barracuda pt",
    ],
    label: "Barracuda Point, Sipadan Island, Sabah, Malaysia",
    latitude: 4.11498,
    longitude: 118.62867,
  },
];

function normalizePlaceQuery(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Exact curated match for place search. Prefers the longest matching alias
 * so "Kapalai Dive Resort" beats a bare "Kapalai" when both could apply.
 */
export function findKnownPlace(query: string): PositionstackResult | null {
  const normalized = normalizePlaceQuery(query);
  if (!normalized) return null;

  let best: { place: KnownPlace; aliasLength: number } | null = null;

  for (const place of KNOWN_PLACES) {
    for (const alias of place.aliases) {
      const needle = normalizePlaceQuery(alias);
      if (!needle) continue;

      const matched =
        normalized === needle ||
        normalized.includes(needle) ||
        needle.includes(normalized);

      // Avoid ultra-short aliases matching unrelated queries (e.g. "kap").
      if (!matched) continue;
      if (needle.length < 6 && normalized !== needle) continue;

      if (!best || needle.length > best.aliasLength) {
        best = { place, aliasLength: needle.length };
      }
    }
  }

  if (!best) return null;

  return {
    latitude: best.place.latitude,
    longitude: best.place.longitude,
    label: best.place.label,
  };
}
