import { NextResponse } from "next/server";
import { buildPeopleGalleryList } from "@/lib/people-gallery";
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
    const people = buildPeopleGalleryList(
      filterPhotosByTripAccess(photos, allowed),
    );
    return NextResponse.json({ people });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /people]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
