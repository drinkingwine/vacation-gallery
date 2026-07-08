import { NextResponse } from "next/server";
import { listAllGalleryPhotos, listTrips } from "@/lib/github";
import type { GalleryHomePhoto } from "@/lib/gallery-home-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [trips, photos] = await Promise.all([
      listTrips(),
      listAllGalleryPhotos(),
    ]);

    const slimPhotos: GalleryHomePhoto[] = photos.map((photo) => ({
      downloadUrl: photo.downloadUrl,
      mediaType: photo.mediaType,
      tags: photo.tags,
      tripName: photo.tripName,
    }));

    return NextResponse.json({ trips, photos: slimPhotos });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /gallery/home]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
