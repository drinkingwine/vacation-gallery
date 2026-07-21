import { NextRequest, NextResponse } from "next/server";
import {
  buildGeocodeQuery,
  buildPlaceGeocodeQueryVariants,
  parseGeocodeAddressPartsFromSearchParams,
  pickBestGeocodeResult,
  pickBestGeocodeResultForQuery,
  isGeocodeResultCountryMismatch,
  isWeakPlaceGeocodeMatch,
  resolveCountryCodeForRequest,
  resolveGeocodeRegionForRequest,
  scoreGeocodeResultForQuery,
  type PositionstackResult,
} from "@/lib/geocode-address";

export const dynamic = "force-dynamic";

type PositionstackApiResponse = {
  data?: Array<{
    latitude?: number;
    longitude?: number;
    label?: string;
    postal_code?: string;
    region?: string;
    region_code?: string;
  }>;
};

type NominatimResult = {
  lat?: string;
  lon?: string;
  display_name?: string;
  address?: {
    postcode?: string;
    state?: string;
    state_code?: string;
  };
};

type GoogleGeocodeResponse = {
  status?: string;
  error_message?: string;
  results?: Array<{
    formatted_address?: string;
    geometry?: { location?: { lat?: number; lng?: number } };
    address_components?: Array<{
      long_name?: string;
      short_name?: string;
      types?: string[];
    }>;
  }>;
};

type GooglePlacesTextSearchResponse = {
  status?: string;
  error_message?: string;
  results?: Array<{
    name?: string;
    formatted_address?: string;
    geometry?: { location?: { lat?: number; lng?: number } };
    place_id?: string;
  }>;
};

type GooglePlaceDetailsResponse = {
  status?: string;
  error_message?: string;
  result?: {
    name?: string;
    formatted_address?: string;
    geometry?: { location?: { lat?: number; lng?: number } };
    address_components?: Array<{
      long_name?: string;
      short_name?: string;
      types?: string[];
    }>;
  };
};

function getGoogleMapsApiKey(): string | null {
  return (
    process.env.GOOGLE_MAPS_GEOCODING_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    null
  );
}

function componentValue(
  components: Array<{
    long_name?: string;
    short_name?: string;
    types?: string[];
  }>,
  type: string,
  short = false,
): string | undefined {
  const match = components.find((part) => part.types?.includes(type));
  return short ? match?.short_name : match?.long_name;
}

function googleResultToCandidate(input: {
  name?: string;
  formatted_address?: string;
  latitude?: number;
  longitude?: number;
  address_components?: Array<{
    long_name?: string;
    short_name?: string;
    types?: string[];
  }>;
}): PositionstackResult | null {
  const { latitude, longitude, formatted_address, address_components } = input;
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }
  if (!formatted_address?.trim()) return null;

  const components = address_components ?? [];
  return {
    latitude,
    longitude,
    label: formatted_address.trim(),
    postal_code: componentValue(components, "postal_code"),
    region: componentValue(components, "administrative_area_level_1"),
    region_code: componentValue(
      components,
      "administrative_area_level_1",
      true,
    ),
  };
}

async function googlePlaceDetails(
  placeId: string,
  apiKey: string,
): Promise<PositionstackResult | null> {
  const params = new URLSearchParams({
    place_id: placeId,
    fields: "name,formatted_address,geometry,address_component",
    key: apiKey,
  });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?${params}`,
    { cache: "no-store" },
  );
  if (!response.ok) return null;

  const data = (await response.json()) as GooglePlaceDetailsResponse;
  if (data.status && data.status !== "OK") {
    console.warn("[geocode/google-places-details]", data.status, data.error_message);
    return null;
  }

  const result = data.result;
  if (!result) return null;

  return googleResultToCandidate({
    name: result.name,
    formatted_address: result.formatted_address,
    latitude: result.geometry?.location?.lat,
    longitude: result.geometry?.location?.lng,
    address_components: result.address_components,
  });
}

/** Named places (resorts, hotels) — returns full street addresses like Maps. */
async function geocodeWithGooglePlaces(
  query: string,
  apiKey: string,
  countryCode: string | null,
): Promise<PositionstackResult[]> {
  const params = new URLSearchParams({
    query,
    key: apiKey,
  });
  if (countryCode) {
    params.set("region", countryCode.toLowerCase());
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`,
    { cache: "no-store" },
  );
  if (!response.ok) return [];

  const data = (await response.json()) as GooglePlacesTextSearchResponse;
  if (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.warn("[geocode/google-places]", data.status, data.error_message);
  }
  if (data.status !== "OK" || !Array.isArray(data.results)) return [];

  const candidates: PositionstackResult[] = [];
  for (const result of data.results.slice(0, 3)) {
    if (result.place_id) {
      const detailed = await googlePlaceDetails(result.place_id, apiKey);
      if (detailed) {
        candidates.push(detailed);
        continue;
      }
    }

    const fallback = googleResultToCandidate({
      name: result.name,
      formatted_address: result.formatted_address,
      latitude: result.geometry?.location?.lat,
      longitude: result.geometry?.location?.lng,
    });
    if (fallback) candidates.push(fallback);
  }

  return candidates;
}

async function geocodeWithGoogle(
  query: string,
  apiKey: string,
  countryCode: string | null,
  mode: "place" | "address",
): Promise<PositionstackResult[]> {
  const params = new URLSearchParams({
    address: query,
    key: apiKey,
  });
  if (countryCode) {
    // Bias like Google Maps; only hard-filter country for structured address search.
    params.set("region", countryCode.toLowerCase());
    if (mode === "address") {
      params.set("components", `country:${countryCode.toUpperCase()}`);
    }
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?${params}`,
    { cache: "no-store" },
  );
  if (!response.ok) return [];

  const data = (await response.json()) as GoogleGeocodeResponse;
  if (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.warn("[geocode/google]", data.status, data.error_message);
  }
  if (data.status !== "OK" || !Array.isArray(data.results)) return [];

  return data.results.slice(0, 5).flatMap((result) => {
    const candidate = googleResultToCandidate({
      formatted_address: result.formatted_address,
      latitude: result.geometry?.location?.lat,
      longitude: result.geometry?.location?.lng,
      address_components: result.address_components,
    });
    return candidate ? [candidate] : [];
  });
}

function toPositionstackResults(
  data: PositionstackApiResponse["data"],
): PositionstackResult[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((result) =>
    typeof result.latitude === "number" && typeof result.longitude === "number"
      ? [
          {
            latitude: result.latitude,
            longitude: result.longitude,
            label: result.label,
            postal_code: result.postal_code,
            region: result.region,
            region_code: result.region_code,
          },
        ]
      : [],
  );
}

async function geocodeWithPositionstack(
  query: string,
  apiKey: string,
  countryCode: string | null,
  region: string | null,
  mode: "place" | "address",
): Promise<PositionstackResult[]> {
  const apiParams = new URLSearchParams({
    access_key: apiKey,
    query,
    limit: "5",
  });
  if (countryCode) {
    apiParams.set("country", countryCode);
  }
  if (mode === "address" && region) {
    apiParams.set("region", region);
  }

  const response = await fetch(
    `http://api.positionstack.com/v1/forward?${apiParams}`,
    { cache: "no-store" },
  );
  if (!response.ok) return [];

  const data = (await response.json()) as PositionstackApiResponse;
  return toPositionstackResults(data?.data);
}

async function geocodeWithNominatim(
  query: string,
  countryCode: string | null,
  originalQuery: string,
): Promise<PositionstackResult | null> {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "5",
    addressdetails: "1",
  });
  if (countryCode) {
    params.set("countrycodes", countryCode.toLowerCase());
  }

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      headers: { "User-Agent": "VacationsApp/1.0 (trip geocoding)" },
      cache: "no-store",
    },
  );

  if (!response.ok) return null;

  const data = (await response.json()) as NominatimResult[];
  if (!Array.isArray(data) || data.length === 0) return null;

  const candidates = data.flatMap((entry) => {
    const latitude = Number(entry.lat);
    const longitude = Number(entry.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];

    return [
      {
        latitude,
        longitude,
        label: entry.display_name,
        postal_code: entry.address?.postcode,
        region: entry.address?.state,
        region_code: entry.address?.state_code,
      },
    ];
  });

  return pickBestGeocodeResultForQuery(candidates, originalQuery);
}

function isCoarseGeocodeLabel(label: string): boolean {
  const normalized = label.trim();
  if (!normalized) return true;
  // e.g. "77580 Puerto Morelos, Q.R., Mexico" — postal/locality only, no street.
  if (/^\d{4,6}\s+\S+/.test(normalized) && !/\d+\s+\w+.*(st|ave|rd|hwy|carretera|km)\b/i.test(normalized)) {
    const commaParts = normalized.split(",").map((part) => part.trim()).filter(Boolean);
    return commaParts.length <= 3 && !/\b(carretera|federal|mz|lote|km)\b/i.test(normalized);
  }
  return false;
}

function considerCandidate(
  current: { result: PositionstackResult; score: number } | null,
  candidate: PositionstackResult | null,
  originalQuery: string,
  mode: "place" | "address",
  options?: { trustProviderRanking?: boolean; scoreBonus?: number },
): { result: PositionstackResult; score: number } | null {
  if (!candidate) return current;
  if (isGeocodeResultCountryMismatch(candidate, originalQuery)) return current;
  if (
    mode === "place" &&
    !options?.trustProviderRanking &&
    isWeakPlaceGeocodeMatch(candidate, originalQuery)
  ) {
    return current;
  }

  let score = options?.trustProviderRanking
    ? 100
    : scoreGeocodeResultForQuery(candidate, originalQuery);
  score += options?.scoreBonus ?? 0;
  if (mode === "place" && isCoarseGeocodeLabel(String(candidate.label ?? ""))) {
    score -= 40;
  }

  if (!current || score > current.score) {
    return { result: candidate, score };
  }
  return current;
}

export async function GET(request: NextRequest) {
  try {
    const positionstackKey =
      process.env.POSITIONSTACK_ACCESS_KEY || process.env.POSITIONSTACK_API_KEY;
    const googleKey = getGoogleMapsApiKey();

    const parts = parseGeocodeAddressPartsFromSearchParams(
      request.nextUrl.searchParams,
    );
    const mode =
      request.nextUrl.searchParams.get("mode") === "place" ? "place" : "address";
    const queryParam = request.nextUrl.searchParams.get("query")?.trim() ?? "";
    const query = queryParam || buildGeocodeQuery(parts);

    if (!query) {
      return NextResponse.json(
        { success: false, error: "query is required" },
        { status: 400 },
      );
    }

    const countryCode = resolveCountryCodeForRequest(parts, query, mode);
    const region = resolveGeocodeRegionForRequest(parts, query);
    const queryVariants =
      mode === "place" ? buildPlaceGeocodeQueryVariants(query) : [query];

    let best: { result: PositionstackResult; score: number } | null = null;

    // Places first for named resorts — returns full street addresses (Carretera Federal…).
    if (googleKey && mode === "place") {
      for (const variant of queryVariants.slice(0, 4)) {
        const results = await geocodeWithGooglePlaces(
          variant,
          googleKey,
          countryCode,
        );
        const candidate = results[0] ?? null;
        best = considerCandidate(best, candidate, query, mode, {
          trustProviderRanking: true,
          scoreBonus: 50,
        });
        if (
          best &&
          !isCoarseGeocodeLabel(String(best.result.label ?? ""))
        ) {
          break;
        }
      }
    }

    if (
      googleKey &&
      (!best || isCoarseGeocodeLabel(String(best.result.label ?? "")))
    ) {
      for (const variant of queryVariants.slice(0, 4)) {
        const results = await geocodeWithGoogle(
          variant,
          googleKey,
          countryCode,
          mode,
        );
        const candidate = results[0] ?? null;
        best = considerCandidate(best, candidate, query, mode, {
          trustProviderRanking: true,
        });
        if (
          best &&
          !isCoarseGeocodeLabel(String(best.result.label ?? ""))
        ) {
          break;
        }
      }
    }

    if (!best && positionstackKey) {
      for (const variant of queryVariants) {
        const results = await geocodeWithPositionstack(
          variant,
          positionstackKey,
          countryCode,
          region,
          mode,
        );
        const candidate =
          mode === "place" || (countryCode !== null && countryCode !== "US")
            ? pickBestGeocodeResultForQuery(results, query)
            : pickBestGeocodeResult(results, parts);
        best = considerCandidate(best, candidate, query, mode);
        if (best && mode === "place" && best.score >= 30) break;
      }
    }

    if (!best) {
      for (const variant of queryVariants) {
        const candidate = await geocodeWithNominatim(
          variant,
          countryCode,
          query,
        );
        best = considerCandidate(best, candidate, query, mode);
        if (best && mode === "place" && best.score >= 30) break;
      }
    }

    if (!best) {
      return NextResponse.json(
        { success: false, error: "No coordinates found for this location" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      latitude: best.result.latitude,
      longitude: best.result.longitude,
      label: best.result.label,
    });
  } catch (error) {
    console.error("Error geocoding address:", error);
    return NextResponse.json(
      { success: false, error: "Failed to geocode address" },
      { status: 500 },
    );
  }
}
