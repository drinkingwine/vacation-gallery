import { NextResponse } from "next/server";
import { buildGalleryItems } from "@/lib/gallery";
import {
  getFavoritesAlbumSummary,
  listFavoriteGalleryPhotos,
} from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const includeItems = searchParams.get("items") === "1";

    if (includeItems) {
      const photos = await listFavoriteGalleryPhotos();
      return NextResponse.json({
        items: buildGalleryItems(photos),
        photoCount: photos.length,
      });
    }

    return NextResponse.json(await getFavoritesAlbumSummary());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /gallery/favorites]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
