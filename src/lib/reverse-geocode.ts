export function formatCoordinates(latitude: number, longitude: number): string {
  const latHemisphere = latitude >= 0 ? "N" : "S";
  const lonHemisphere = longitude >= 0 ? "E" : "W";
  return `${Math.abs(latitude).toFixed(5)}° ${latHemisphere}, ${Math.abs(longitude).toFixed(5)}° ${lonHemisphere}`;
}

/** True for 0,0 (Null Island) — usually a missing/corrupt GPS reading. */
export function isNullIslandCoords(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): boolean {
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return false;
  }
  return Math.abs(latitude) < 1e-6 && Math.abs(longitude) < 1e-6;
}

type NominatimResponse = {
  display_name?: string;
};

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "json");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("zoom", "16");
  url.searchParams.set("addressdetails", "1");

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "VacationsGallery/1.0",
      },
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as NominatimResponse;
    const address = data.display_name?.trim();
    return address || null;
  } catch {
    return null;
  }
}
