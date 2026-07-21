import { NextRequest, NextResponse } from "next/server";
import { updatePhoto } from "@/lib/github";

export const dynamic = "force-dynamic";

function parseOptionalCoordinate(
  value: unknown,
  min: number,
  max: number,
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  if (value < min || value > max) return undefined;
  return value;
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      path,
      sha,
      trip,
      caption,
      newName,
      addTag,
      removeTag,
      tags,
      dateTaken,
      location,
      latitude,
      longitude,
    } = body as {
      path?: string;
      sha?: string;
      trip?: string;
      caption?: string;
      newName?: string;
      addTag?: string;
      removeTag?: string;
      tags?: string[];
      dateTaken?: string | null;
      location?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    };

    if (!path || !sha || !trip) {
      return NextResponse.json(
        { error: "path, sha, and trip are required" },
        { status: 400 },
      );
    }

    const parsedLatitude = parseOptionalCoordinate(latitude, -90, 90);
    const parsedLongitude = parseOptionalCoordinate(longitude, -180, 180);

    if (latitude !== undefined && parsedLatitude === undefined) {
      return NextResponse.json(
        { error: "latitude must be a number between -90 and 90, or null" },
        { status: 400 },
      );
    }
    if (longitude !== undefined && parsedLongitude === undefined) {
      return NextResponse.json(
        { error: "longitude must be a number between -180 and 180, or null" },
        { status: 400 },
      );
    }

    await updatePhoto({
      path,
      sha,
      trip,
      caption: typeof caption === "string" ? caption : undefined,
      newName: typeof newName === "string" ? newName : undefined,
      addTag: typeof addTag === "string" ? addTag : undefined,
      removeTag: typeof removeTag === "string" ? removeTag : undefined,
      tags: Array.isArray(tags)
        ? tags.filter((tag): tag is string => typeof tag === "string")
        : undefined,
      dateTaken:
        dateTaken === null
          ? null
          : typeof dateTaken === "string"
            ? dateTaken
            : undefined,
      location:
        location === null
          ? null
          : typeof location === "string"
            ? location
            : undefined,
      latitude: parsedLatitude,
      longitude: parsedLongitude,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /photos/update]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
