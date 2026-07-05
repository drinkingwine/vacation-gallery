import { NextRequest, NextResponse } from "next/server";
import { upsertPhotoMetadata } from "@/lib/github";
import { isMedia, sanitizeMediaFilename } from "@/lib/media";
import { headMedia } from "@/lib/r2";
import {
  formatCoordinates,
  reverseGeocode,
} from "@/lib/reverse-geocode";

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

    if (tripPath && latitude !== undefined && longitude !== undefined) {
      let location = await reverseGeocode(latitude, longitude);
      if (!location) {
        location = formatCoordinates(latitude, longitude);
      }

      await upsertPhotoMetadata(tripPath, safeName, {
        location,
        latitude,
        longitude,
        ...(dateTaken ? { dateTaken } : {}),
      });
    } else if (tripPath && dateTaken) {
      await upsertPhotoMetadata(tripPath, safeName, { dateTaken });
    }

    return NextResponse.json({ success: true, path });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /upload/complete]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
