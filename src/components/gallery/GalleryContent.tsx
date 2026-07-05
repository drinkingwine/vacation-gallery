import { buildGalleryItems } from "@/lib/gallery";
import {
  filterGalleryPhotos,
  filterGalleryPhotosByMediaType,
  paginateGalleryPhotos,
  sortGalleryPhotos,
} from "@/lib/gallery-query";
import { listAllGalleryPhotos } from "@/lib/github";
import { GalleryWithFilter } from "@/components/gallery/GalleryWithFilter";

const PAGE_SIZE = 24;

type GalleryContentProps = {
  initialKeyword?: string;
};

export async function GalleryContent({
  initialKeyword = "",
}: GalleryContentProps) {
  const keyword = initialKeyword.trim();
  const allPhotos = await listAllGalleryPhotos();
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
    />
  );
}
