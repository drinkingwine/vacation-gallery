import { NextResponse } from "next/server";
import { buildThingsGalleryList } from "@/lib/things-gallery";
import { listAllGalleryPhotos } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const photos = await listAllGalleryPhotos();
    const things = buildThingsGalleryList(photos);
    return NextResponse.json({ things });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /things]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
