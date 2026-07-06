import { NextRequest, NextResponse } from "next/server";
import { buildGalleryItems } from "@/lib/gallery";
import {
  filterGalleryPhotos,
  filterGalleryPhotosByMediaType,
  filterGalleryPhotosByTag,
  filterGalleryPhotosByTrip,
  paginateGalleryPhotos,
  sortGalleryPhotos,
} from "@/lib/gallery-query";
import { listAllGalleryPhotos } from "@/lib/github";
import { galleryPhotosForPeople } from "@/lib/people-gallery";
import type { GallerySortOrder } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(
      48,
      Math.max(1, Number.parseInt(params.get("pageSize") ?? "24", 10) || 24),
    );
    const keyword = params.get("q") ?? "";
    const tag = params.get("tag") ?? "";
    const trip = params.get("trip") ?? "";
    const mediaType = params.get("mediaType") ?? "all";
    const sortOrder: GallerySortOrder =
      params.get("sortOrder") === "oldest" ? "oldest" : "newest";

    const sourcePhotos = tag
      ? galleryPhotosForPeople(await listAllGalleryPhotos())
      : await listAllGalleryPhotos();

    const all = sortGalleryPhotos(
      filterGalleryPhotos(
        filterGalleryPhotosByTrip(
          filterGalleryPhotosByTag(
            filterGalleryPhotosByMediaType(sourcePhotos, mediaType),
            tag,
          ),
          trip,
        ),
        keyword,
      ),
      sortOrder,
    );
    const { items, hasNext, total } = paginateGalleryPhotos(all, page, pageSize);

    return NextResponse.json({
      items: buildGalleryItems(items),
      page,
      hasNext,
      total,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /gallery]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
