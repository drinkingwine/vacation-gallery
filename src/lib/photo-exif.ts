export type PhotoExifData = {
  latitude?: number;
  longitude?: number;
  dateTaken?: string;
};

function toIsoDate(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return undefined;
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function parseGpsPair(
  latitude: unknown,
  longitude: unknown,
): { latitude: number; longitude: number } | undefined {
  const lat = toFiniteNumber(latitude);
  const lng = toFiniteNumber(longitude);
  if (lat === undefined || lng === undefined) return undefined;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return undefined;
  // Null Island is almost never a real capture location.
  if (Math.abs(lat) < 1e-6 && Math.abs(lng) < 1e-6) return undefined;
  return { latitude: lat, longitude: lng };
}

export async function extractPhotoExif(
  source: File | Blob | ArrayBuffer | Uint8Array,
): Promise<PhotoExifData | null> {
  try {
    const exifr = (await import("exifr")).default;
    const [gps, exif] = await Promise.all([
      exifr.gps(source),
      exifr.parse(source, ["DateTimeOriginal", "CreateDate", "ModifyDate"]),
    ]);

    const dateTaken =
      toIsoDate(exif?.DateTimeOriginal) ??
      toIsoDate(exif?.CreateDate) ??
      toIsoDate(exif?.ModifyDate);

    const coords = parseGpsPair(gps?.latitude, gps?.longitude);

    if (!coords && !dateTaken) return null;

    return {
      ...(coords ?? {}),
      ...(dateTaken ? { dateTaken } : {}),
    };
  } catch {
    return null;
  }
}

export function hasPhotoExifGps(
  exif: PhotoExifData | null | undefined,
): exif is PhotoExifData & { latitude: number; longitude: number } {
  return (
    typeof exif?.latitude === "number" &&
    typeof exif?.longitude === "number" &&
    Number.isFinite(exif.latitude) &&
    Number.isFinite(exif.longitude)
  );
}
