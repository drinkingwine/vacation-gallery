import { NextRequest, NextResponse } from "next/server";
import {
  buildGeocodeQuery,
  parseGeocodeAddressPartsFromSearchParams,
  pickBestGeocodeResult,
  pickBestGeocodeResultForQuery,
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

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.POSITIONSTACK_ACCESS_KEY || process.env.POSITIONSTACK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "POSITIONSTACK_ACCESS_KEY is not configured" },
        { status: 500 },
      );
    }

    const parts = parseGeocodeAddressPartsFromSearchParams(request.nextUrl.searchParams);
    const mode = request.nextUrl.searchParams.get("mode") === "place" ? "place" : "address";
    const queryParam = request.nextUrl.searchParams.get("query")?.trim() ?? "";
    const query = queryParam || buildGeocodeQuery(parts);

    if (!query) {
      return NextResponse.json({ success: false, error: "query is required" }, { status: 400 });
    }

    const region = resolveGeocodeRegionForRequest(parts, query);
    const apiParams = new URLSearchParams({
      access_key: apiKey,
      query,
      limit: "5",
    });
    if (mode === "address") {
      apiParams.set("country", "US");
    }
    if (mode === "address" && region) {
      apiParams.set("region", region);
    }

    const response = await fetch(`http://api.positionstack.com/v1/forward?${apiParams}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Positionstack request failed (${response.status})` },
        { status: 502 },
      );
    }

    const data = (await response.json()) as PositionstackApiResponse;
    const results: PositionstackResult[] = Array.isArray(data?.data)
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

    const bestResult =
      mode === "place"
        ? pickBestGeocodeResultForQuery(results, query)
        : pickBestGeocodeResult(results, parts);

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
