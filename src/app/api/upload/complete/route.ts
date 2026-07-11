import { NextRequest, NextResponse } from "next/server";
import { getTripMetadata, upsertPhotoMetadata } from "@/lib/github";
import { isMedia, sanitizeMediaFilename } from "@/lib/media";
import { invalidateGalleryCaches } from "@/lib/github";
import { headMedia } from "@/lib/r2";
import {
  formatCoordinates,
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

  if (tripLatitude !== undefined && tripLongitude !== undefined) {
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

    const latitude = parseLatitude(body.latitude);
    const longitude = parseLongitude(body.longitude);
    const dateTaken =
      typeof body.dateTaken === "string" && body.dateTaken.trim()
        ? body.dateTaken.trim()
        : undefined;

    const tripPath =
      trip ?? (path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "");

    invalidateGalleryCaches(tripPath || undefined);

    if (tripPath) {
      const locationMeta = await resolveUploadLocation(latitude, longitude, tripPath);
      const patch: Partial<PhotoMetaEntry> = {
        ...(locationMeta ?? {}),
        ...(dateTaken ? { dateTaken } : {}),
      };

      if (Object.keys(patch).length > 0) {
        await upsertPhotoMetadata(tripPath, safeName, patch);
      }
    }

    return NextResponse.json({ success: true, path });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /upload/complete]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
