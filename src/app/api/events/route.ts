import { NextResponse } from "next/server";
import { buildEventsGalleryList } from "@/lib/events-gallery";
import { listTrips } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const trips = await listTrips();
    const events = buildEventsGalleryList(trips);
    return NextResponse.json({ events });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /events]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
