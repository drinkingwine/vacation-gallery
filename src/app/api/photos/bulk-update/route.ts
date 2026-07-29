import { NextRequest, NextResponse } from "next/server";
import { updatePhotosBulk } from "@/lib/github";
import { requireAdminSession } from "@/lib/server-auth";

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
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      trip?: string;
      paths?: unknown;
      addTag?: string;
      location?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    };

    const trip = typeof body.trip === "string" ? body.trip.trim() : "";
    const paths = Array.isArray(body.paths)
      ? body.paths.filter((path): path is string => typeof path === "string")
      : [];

    if (!trip) {
      return NextResponse.json({ error: "trip is required" }, { status: 400 });
    }
    if (paths.length === 0) {
      return NextResponse.json(
        { error: "paths must include at least one photo" },
        { status: 400 },
      );
    }

    const parsedLatitude = parseOptionalCoordinate(body.latitude, -90, 90);
    const parsedLongitude = parseOptionalCoordinate(body.longitude, -180, 180);

    if (body.latitude !== undefined && parsedLatitude === undefined) {
      return NextResponse.json(
        { error: "latitude must be a number between -90 and 90, or null" },
        { status: 400 },
      );
    }
    if (body.longitude !== undefined && parsedLongitude === undefined) {
      return NextResponse.json(
        { error: "longitude must be a number between -180 and 180, or null" },
        { status: 400 },
      );
    }

    const addTag =
      typeof body.addTag === "string" ? body.addTag.trim() : undefined;
    const hasLocationPatch =
      body.location !== undefined ||
      body.latitude !== undefined ||
      body.longitude !== undefined;

    if (!addTag && !hasLocationPatch) {
      return NextResponse.json(
        { error: "Provide addTag and/or location fields to apply" },
        { status: 400 },
      );
    }

    await updatePhotosBulk({
      trip,
      paths,
      addTag: addTag || undefined,
      location:
        body.location === null
          ? null
          : typeof body.location === "string"
            ? body.location
            : undefined,
      latitude: parsedLatitude,
      longitude: parsedLongitude,
    });

    return NextResponse.json({ success: true, updated: paths.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /photos/bulk-update]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
