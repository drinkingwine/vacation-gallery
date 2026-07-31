import { NextResponse } from "next/server";
import { listGeotaggedPhotos, listTrips } from "@/lib/github";
import { groupPhotosByLocation } from "@/lib/map";
import { getServerSession } from "@/lib/server-auth";
import {
  filterPhotosByTripAccess,
  visibleTripNames,
} from "@/lib/trip-access";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession();
    const [photos, trips] = await Promise.all([
      listGeotaggedPhotos(),
      listTrips(),
    ]);
    const allowed = visibleTripNames(trips, session);
    const visiblePhotos = filterPhotosByTripAccess(photos, allowed);
    const locations = groupPhotosByLocation(visiblePhotos);

    return NextResponse.json({
      locations,
      photoCount: visiblePhotos.length,
      locationCount: locations.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /map/photos]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
