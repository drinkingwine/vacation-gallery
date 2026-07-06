import { NextResponse } from "next/server";
import { buildPlacesGalleryList } from "@/lib/places-gallery";
import { listTrips } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const trips = await listTrips();
    const places = buildPlacesGalleryList(trips);
    return NextResponse.json({ places });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /places]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
