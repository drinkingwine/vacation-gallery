import { NextRequest, NextResponse } from "next/server";
import { buildPeopleGalleryList } from "@/lib/people-gallery";
import { listAllGalleryPhotos } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const randomCovers = req.nextUrl.searchParams.get("randomCovers") === "1";
    const photos = await listAllGalleryPhotos();
    const people = buildPeopleGalleryList(photos, { randomCovers });
    return NextResponse.json({ people });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /people]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
