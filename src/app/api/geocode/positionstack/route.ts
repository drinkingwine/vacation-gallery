import { NextRequest, NextResponse } from "next/server";
import {
  buildGeocodeQuery,
  parseGeocodeAddressPartsFromSearchParams,
  pickBestGeocodeResult,
  pickBestGeocodeResultForQuery,
  resolveCountryCodeForRequest,
  resolveGeocodeRegionForRequest,
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

async function geocodeWithNominatim(
  query: string,
  countryCode: string | null,
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

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { "User-Agent": "VacationsApp/1.0 (trip geocoding)" },
    cache: "no-store",
  });

  if (!response.ok) return null;

  const data = (await response.json()) as NominatimResult[];
  if (!Array.isArray(data) || data.length === 0) return null;

  const best = data[0];
  const latitude = Number(best.lat);
  const longitude = Number(best.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return {
    latitude,
    longitude,
    label: best.display_name,
    postal_code: best.address?.postcode,
    region: best.address?.state,
    region_code: best.address?.state_code,
  };
}

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.POSITIONSTACK_ACCESS_KEY || process.env.POSITIONSTACK_API_KEY;

    const parts = parseGeocodeAddressPartsFromSearchParams(request.nextUrl.searchParams);
    const mode = request.nextUrl.searchParams.get("mode") === "place" ? "place" : "address";
    const queryParam = request.nextUrl.searchParams.get("query")?.trim() ?? "";
    const query = queryParam || buildGeocodeQuery(parts);

    if (!query) {
      return NextResponse.json({ success: false, error: "query is required" }, { status: 400 });
    }

    const countryCode = resolveCountryCodeForRequest(parts, query, mode);
    const region = resolveGeocodeRegionForRequest(parts, query);
    let results: PositionstackResult[] = [];

    if (apiKey) {
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

      const response = await fetch(`http://api.positionstack.com/v1/forward?${apiParams}`, {
        cache: "no-store",
      });

      if (response.ok) {
        const data = (await response.json()) as PositionstackApiResponse;
        results = Array.isArray(data?.data)
          ? data.data.flatMap((result) =>
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
            )
          : [];
      }
    }

    const useQueryScoring =
      mode === "place" || (mode === "address" && countryCode !== null && countryCode !== "US");

    let bestResult = useQueryScoring
      ? pickBestGeocodeResultForQuery(results, query)
      : pickBestGeocodeResult(results, parts);

    if (!bestResult) {
      bestResult = await geocodeWithNominatim(query, countryCode);
    }

    if (!bestResult) {
      return NextResponse.json(
        { success: false, error: "No coordinates found for this location" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      latitude: bestResult.latitude,
      longitude: bestResult.longitude,
      label: bestResult.label,
    });
  } catch (error) {
    console.error("Error geocoding address with Positionstack:", error);
    return NextResponse.json({ success: false, error: "Failed to geocode address" }, { status: 500 });
  }
}
