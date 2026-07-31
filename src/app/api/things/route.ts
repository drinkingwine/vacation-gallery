import { NextResponse } from "next/server";
import { buildThingsGalleryList } from "@/lib/things-gallery";
import { listAllGalleryPhotos, listTrips } from "@/lib/github";
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
      listAllGalleryPhotos(),
      listTrips(),
    ]);
    const allowed = visibleTripNames(trips, session);
    const things = buildThingsGalleryList(
      filterPhotosByTripAccess(photos, allowed),
    );
    return NextResponse.json({ things });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /things]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
