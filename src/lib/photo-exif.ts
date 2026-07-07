import exifr from "exifr";

export type PhotoExifData = {
  latitude?: number;
  longitude?: number;
  dateTaken?: string;
};

export function parsePhotoTimestamp(value: string | undefined | null): number | null {
  if (!value?.trim()) return null;

  const trimmed = value.trim();
  const exifMatch = trimmed.match(
    /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/,
  );
  if (exifMatch) {
    const [, year, month, day, hour, minute, second] = exifMatch;
    const parsed = Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    );
    if (Number.isFinite(parsed)) return parsed;
  }

  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

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

export async function extractPhotoExif(
  file: File | Blob,
): Promise<PhotoExifData | null> {
  try {
    const [gps, exif] = await Promise.all([
      exifr.gps(file),
      exifr.parse(file, ["DateTimeOriginal", "CreateDate", "ModifyDate"]),
    ]);

    const dateTaken =
      toIsoDate(exif?.DateTimeOriginal) ??
      toIsoDate(exif?.CreateDate) ??
      toIsoDate(exif?.ModifyDate);

    const hasGps =
      gps &&
      typeof gps.latitude === "number" &&
      typeof gps.longitude === "number" &&
      !Number.isNaN(gps.latitude) &&
      !Number.isNaN(gps.longitude);

    if (!hasGps && !dateTaken) return null;

    return {
      ...(hasGps
        ? { latitude: gps.latitude, longitude: gps.longitude }
        : {}),
      ...(dateTaken ? { dateTaken } : {}),
    };
  } catch {
    return null;
  }
}
