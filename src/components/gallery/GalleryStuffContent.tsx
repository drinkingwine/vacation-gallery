import { GuestGalleryAlbumHero } from "@/components/gallery/GuestGalleryAlbumHero";
import { pickHeroImages } from "@/lib/hero-images";
import { GalleryWithFilter } from "@/components/gallery/GalleryWithFilter";
import { buildGalleryItems } from "@/lib/gallery";
import {
  filterGalleryPhotos,
  filterGalleryPhotosByMediaType,
  filterGalleryPhotosByTrip,
  paginateGalleryPhotos,
  sortGalleryPhotos,
} from "@/lib/gallery-query";
import { galleryCopy } from "@/lib/gallery-copy";
import { listAllGalleryPhotos, listTrips } from "@/lib/github";
import { findStuffSummary } from "@/lib/stuff-gallery";

const PAGE_SIZE = 24;

type GalleryStuffContentProps = {
  slug: string;
  initialKeyword?: string;
};

export async function GalleryStuffContent({
  slug,
  initialKeyword = "",
}: GalleryStuffContentProps) {
  const normalizedSlug = slug.trim().toLowerCase();
  const keyword = initialKeyword.trim();
  const stuff = findStuffSummary(await listTrips(), normalizedSlug);
  if (!stuff) {
    return null;
  }

  const allPhotos = await listAllGalleryPhotos();
  const filtered = filterGalleryPhotos(
    filterGalleryPhotosByTrip(
      filterGalleryPhotosByMediaType(allPhotos, "all"),
      stuff.tripName,
    ),
    keyword,
  );
  const sorted = sortGalleryPhotos(filtered, "newest");
  const viewerItems = buildGalleryItems(sorted);
  const { items: pagePhotos, hasNext } = paginateGalleryPhotos(
    sorted,
    1,
    PAGE_SIZE,
  );
  const items = buildGalleryItems(pagePhotos);
  const heroImages = pickHeroImages(
    viewerItems
      .filter((item) => item.type === "photo")
      .map((item) => item.src),
    stuff.coverUrl,
  );

  return (
    <div className="space-y-8">
      <GuestGalleryAlbumHero images={heroImages} title={stuff.label} />

      <GalleryWithFilter
        key={normalizedSlug}
        initialItems={items}
        initialViewerItems={viewerItems}
        initialHasNext={hasNext}
        pageSize={PAGE_SIZE}
        initialKeyword={keyword}
        trip={stuff.tripName}
        emptyMessage={galleryCopy.stuff.noPhotos(stuff.label)}
        showTagFilter
      />
    </div>
  );
}
