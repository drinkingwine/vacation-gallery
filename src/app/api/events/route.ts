import { NextResponse } from "next/server";
import { buildEventsGalleryList } from "@/lib/events-gallery";
import { listTrips } from "@/lib/github";
import { getServerSession } from "@/lib/server-auth";
import { filterTripsForSession } from "@/lib/trip-access";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession();
    const trips = filterTripsForSession(await listTrips(), session);
    const events = buildEventsGalleryList(trips);
    return NextResponse.json({ events });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /events]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
