import { NextResponse } from "next/server";
import { listGeotaggedPhotos } from "@/lib/github";
import { groupPhotosByLocation } from "@/lib/map";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const photos = await listGeotaggedPhotos();
    const locations = groupPhotosByLocation(photos);

    return NextResponse.json({
      locations,
      photoCount: photos.length,
      locationCount: locations.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /map/photos]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
