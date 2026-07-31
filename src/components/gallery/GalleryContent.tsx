import { buildGalleryItems } from "@/lib/gallery";
import {
  filterGalleryPhotos,
  filterGalleryPhotosByMediaType,
  paginateGalleryPhotos,
  sortGalleryPhotos,
} from "@/lib/gallery-query";
import { listAllGalleryPhotos, listTrips } from "@/lib/github";
import { GalleryWithFilter } from "@/components/gallery/GalleryWithFilter";
import { getServerSession } from "@/lib/server-auth";
import {
  filterPhotosByTripAccess,
  visibleTripNames,
} from "@/lib/trip-access";

const PAGE_SIZE = 24;

type GalleryContentProps = {
  initialKeyword?: string;
};

export async function GalleryContent({
  initialKeyword = "",
}: GalleryContentProps) {
  const keyword = initialKeyword.trim();
  const session = await getServerSession();
  const [listedPhotos, trips] = await Promise.all([
    listAllGalleryPhotos(),
    listTrips(),
  ]);
  const allPhotos = filterPhotosByTripAccess(
    listedPhotos,
    visibleTripNames(trips, session),
  );
  const filtered = filterGalleryPhotos(
    filterGalleryPhotosByMediaType(allPhotos, "all"),
    keyword,
  );
  const sorted = sortGalleryPhotos(filtered, "newest");
  const { items: pagePhotos, hasNext } = paginateGalleryPhotos(
    sorted,
    1,
    PAGE_SIZE,
  );
  const items = buildGalleryItems(pagePhotos);

  return (
    <GalleryWithFilter
      initialItems={items}
      initialHasNext={hasNext}
      pageSize={PAGE_SIZE}
      initialKeyword={keyword}
      gridEngine="lightgallery"
    />
  );
}
