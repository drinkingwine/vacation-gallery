import { NextResponse } from "next/server";
import { buildPeopleGalleryList } from "@/lib/people-gallery";
import { listAllGalleryPhotos } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const photos = await listAllGalleryPhotos();
    const people = buildPeopleGalleryList(photos);
    return NextResponse.json({ people });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /gallery/people]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
