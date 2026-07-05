import exifr from "exifr";

export type PhotoExifData = {
  latitude: number;
  longitude: number;
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

export async function extractPhotoExif(
  file: File | Blob,
): Promise<PhotoExifData | null> {
  try {
    const [gps, exif] = await Promise.all([
      exifr.gps(file),
      exifr.parse(file, ["DateTimeOriginal", "CreateDate", "ModifyDate"]),
    ]);

    if (
      !gps ||
      typeof gps.latitude !== "number" ||
      typeof gps.longitude !== "number" ||
      Number.isNaN(gps.latitude) ||
      Number.isNaN(gps.longitude)
    ) {
      return null;
    }

    const dateTaken =
      toIsoDate(exif?.DateTimeOriginal) ??
      toIsoDate(exif?.CreateDate) ??
      toIsoDate(exif?.ModifyDate);

    return {
      latitude: gps.latitude,
      longitude: gps.longitude,
      ...(dateTaken ? { dateTaken } : {}),
    };
  } catch {
    return null;
  }
}
