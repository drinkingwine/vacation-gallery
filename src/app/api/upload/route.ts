import { NextRequest, NextResponse } from "next/server";
import { isImage, uploadFile, upsertPhotoMetadata } from "@/lib/github";
import {
  formatCoordinates,
  reverseGeocode,
} from "@/lib/reverse-geocode";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_SIZE_MB = 25;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

type UploadBody = {
  filename: string;
  content: string;
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
    const body = (await req.json()) as UploadBody;
    const { filename, content, trip } = body;

    if (!filename || !content) {
      return NextResponse.json(
        { error: "filename and content are required" },
        { status: 400 },
      );
    }

    if (!isImage(filename)) {
      return NextResponse.json(
        { error: "Only image files are supported" },
        { status: 400 },
      );
    }

    const estimatedBytes = (content.length * 3) / 4;
    if (estimatedBytes > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_SIZE_MB}MB` },
        { status: 413 },
      );
    }

    const safeName = filename.replace(/[^a-zA-Z0-9.\-_ ]/g, "").trim();
    if (!safeName) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    const path = trip ? `${trip}/${safeName}` : safeName;

    await uploadFile(path, content, `Upload: ${safeName}`);

    const latitude = parseLatitude(body.latitude);
    const longitude = parseLongitude(body.longitude);
    const dateTaken =
      typeof body.dateTaken === "string" && body.dateTaken.trim()
        ? body.dateTaken.trim()
        : undefined;

    if (trip && latitude !== undefined && longitude !== undefined) {
      let location = await reverseGeocode(latitude, longitude);
      if (!location) {
        location = formatCoordinates(latitude, longitude);
      }

      await upsertPhotoMetadata(trip, safeName, {
        location,
        latitude,
        longitude,
        ...(dateTaken ? { dateTaken } : {}),
      });
    } else if (trip && dateTaken) {
      await upsertPhotoMetadata(trip, safeName, { dateTaken });
    }

    return NextResponse.json({ success: true, path });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /upload]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
