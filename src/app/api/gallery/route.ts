import { NextRequest, NextResponse } from "next/server";
import { buildGalleryItems } from "@/lib/gallery";
import {
  filterGalleryPhotos,
  filterGalleryPhotosByMediaType,
  filterGalleryPhotosByTag,
  filterGalleryPhotosByTrip,
  filterGalleryPhotosByPlace,
  paginateGalleryPhotos,
  sortGalleryPhotos,
} from "@/lib/gallery-query";
import { listAllGalleryPhotos } from "@/lib/github";
import { galleryPhotosForPeople } from "@/lib/people-gallery";
import { galleryPhotosForThings } from "@/lib/things-gallery";
import { isPeoplePhotoTag, isThingPhotoTag } from "@/lib/photo-tags";
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
    const place = params.get("place") ?? "";
    const mediaType = params.get("mediaType") ?? "all";
    const sortOrder: GallerySortOrder =
      params.get("sortOrder") === "oldest" ? "oldest" : "newest";

    const allPhotos = await listAllGalleryPhotos();
    const sourcePhotos = tag
      ? isThingPhotoTag(tag)
        ? galleryPhotosForThings(allPhotos)
        : isPeoplePhotoTag(tag)
          ? galleryPhotosForPeople(allPhotos)
          : allPhotos
      : allPhotos;

    const all = sortGalleryPhotos(
      filterGalleryPhotos(
        filterGalleryPhotosByTrip(
          filterGalleryPhotosByPlace(
            filterGalleryPhotosByTag(
              filterGalleryPhotosByMediaType(sourcePhotos, mediaType),
              tag,
            ),
            place,
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
