import { NextResponse } from "next/server";
import {
  getGalleryHomeServerPayload,
  invalidateGalleryHomeServerCache,
} from "@/lib/gallery-home-server-cache";
import { getServerSession } from "@/lib/server-auth";
import {
  filterPhotosByTripAccess,
  filterTripsForSession,
  visibleTripNames,
} from "@/lib/trip-access";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const fresh = new URL(request.url).searchParams.get("fresh") === "1";
    if (fresh) {
      invalidateGalleryHomeServerCache();
    }
    const session = await getServerSession();
    const payload = await getGalleryHomeServerPayload();
    const trips = filterTripsForSession(payload.trips, session);
    const allowed = visibleTripNames(payload.trips, session);
    const photos = filterPhotosByTripAccess(payload.photos, allowed);

    return NextResponse.json(
      { trips, photos },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /gallery/home]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
