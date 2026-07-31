import { NextResponse } from "next/server";
import { buildPlacesGalleryList } from "@/lib/places-gallery";
import { listTrips } from "@/lib/github";
import { getServerSession } from "@/lib/server-auth";
import { filterTripsForSession } from "@/lib/trip-access";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession();
    const trips = filterTripsForSession(await listTrips(), session);
    const places = buildPlacesGalleryList(trips);
    return NextResponse.json({ places });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /places]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
