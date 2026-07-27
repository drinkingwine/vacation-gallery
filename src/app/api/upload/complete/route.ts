import { NextRequest, NextResponse } from "next/server";
import { getTripMetadata, upsertPhotoMetadata } from "@/lib/github";
import { isImage, isMedia, sanitizeMediaFilename } from "@/lib/media";
import { extractPhotoExif, hasPhotoExifGps } from "@/lib/photo-exif";
import { fetchMediaForDownload, headMedia } from "@/lib/r2";
import {
  formatCoordinates,
  isNullIslandCoords,
  reverseGeocode,
} from "@/lib/reverse-geocode";
import type { PhotoMetaEntry } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type CompleteBody = {
  path: string;
  trip?: string;
  latitude?: number;
  longitude?: number;
  dateTaken?: string;
};

function parseLatitude(value: unknown): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  if (value < -90 || value > 90) return undefined;
  return value;
}

function parseLongitude(value: unknown): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  if (value < -180 || value > 180) return undefined;
  return value;
}

async function readUploadedImageGps(
  path: string,
): Promise<{ latitude: number; longitude: number } | null> {
  if (!isImage(path)) return null;
  try {
    const media = await fetchMediaForDownload(path);
    const exif = await extractPhotoExif(media.data);
    if (!hasPhotoExifGps(exif)) return null;
    return { latitude: exif.latitude, longitude: exif.longitude };
  } catch {
    return null;
  }
}

/**
 * Prefer coordinates embedded in the photo. Only fall back to the trip's
 * default lat/lng (and location label) when the image has no usable GPS.
 */
async function resolveUploadLocation(
  imageLatitude: number | undefined,
  imageLongitude: number | undefined,
  tripPath: string,
): Promise<Partial<PhotoMetaEntry> | null> {
  if (imageLatitude !== undefined && imageLongitude !== undefined) {
    let location = await reverseGeocode(imageLatitude, imageLongitude);
    if (!location) {
      location = formatCoordinates(imageLatitude, imageLongitude);
    }

    return {
      location,
      latitude: imageLatitude,
      longitude: imageLongitude,
    };
  }

  const tripMeta = await getTripMetadata(tripPath);
  const tripLatitude =
    typeof tripMeta.latitude === "number" && !Number.isNaN(tripMeta.latitude)
      ? tripMeta.latitude
      : undefined;
  const tripLongitude =
    typeof tripMeta.longitude === "number" && !Number.isNaN(tripMeta.longitude)
      ? tripMeta.longitude
      : undefined;
  const tripLocation = tripMeta.location?.trim();

  if (
    tripLatitude !== undefined &&
    tripLongitude !== undefined &&
    !isNullIslandCoords(tripLatitude, tripLongitude)
  ) {
    return {
      location: tripLocation || formatCoordinates(tripLatitude, tripLongitude),
      latitude: tripLatitude,
      longitude: tripLongitude,
    };
  }

  if (tripLocation) {
    return { location: tripLocation };
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CompleteBody;
    const { path, trip } = body;

    if (!path || typeof path !== "string") {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }

    const filename = path.split("/").pop() ?? "";
    const safeName = sanitizeMediaFilename(filename);
    if (!safeName || !isMedia(safeName)) {
      return NextResponse.json({ error: "Invalid media path" }, { status: 400 });
    }

    await headMedia(path);

    let latitude = parseLatitude(body.latitude);
    let longitude = parseLongitude(body.longitude);
    const dateTaken =
      typeof body.dateTaken === "string" && body.dateTaken.trim()
        ? body.dateTaken.trim()
        : undefined;

    const tripPath =
      trip ?? (path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "");

    let hasImageGps =
      latitude !== undefined &&
      longitude !== undefined &&
      !isNullIslandCoords(latitude, longitude);

    // Client compression strips EXIF from the stored file's body may omit GPS;
    // if the browser didn't send coords, try reading GPS from the uploaded object
    // only when the original bytes still contain EXIF (uncompressed uploads).
    if (!hasImageGps) {
      const uploadedGps = await readUploadedImageGps(path);
      if (uploadedGps) {
        latitude = uploadedGps.latitude;
        longitude = uploadedGps.longitude;
        hasImageGps = true;
      }
    }

    if (tripPath) {
      const locationMeta = await resolveUploadLocation(
        hasImageGps ? latitude : undefined,
        hasImageGps ? longitude : undefined,
        tripPath,
      );
      const patch: Partial<PhotoMetaEntry> = {
        ...(locationMeta ?? {}),
        ...(dateTaken ? { dateTaken } : {}),
      };

      if (Object.keys(patch).length > 0) {
        // Image GPS always wins over any prior geo (including trip defaults).
        await upsertPhotoMetadata(tripPath, safeName, patch, {
          preserveExistingGeo: !hasImageGps,
        });
      }
    }

    return NextResponse.json({
      success: true,
      path,
      usedImageGps: hasImageGps,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /upload/complete]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
