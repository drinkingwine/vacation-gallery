import { NextRequest, NextResponse } from "next/server";
import { buildPlacesGalleryList } from "@/lib/places-gallery";
import { listAllGalleryPhotos, listTrips } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const randomCovers = req.nextUrl.searchParams.get("randomCovers") === "1";
    const trips = await listTrips();
    const photos = randomCovers ? await listAllGalleryPhotos() : undefined;
    const places = buildPlacesGalleryList(trips, { randomCovers, photos });
    return NextResponse.json({ places });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /places]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
