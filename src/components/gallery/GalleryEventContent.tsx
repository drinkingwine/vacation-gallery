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
import { findEventSummary } from "@/lib/events-gallery";

const PAGE_SIZE = 24;

type GalleryEventContentProps = {
  slug: string;
  initialKeyword?: string;
};

export async function GalleryEventContent({
  slug,
  initialKeyword = "",
}: GalleryEventContentProps) {
  const normalizedSlug = slug.trim().toLowerCase();
  const keyword = initialKeyword.trim();
  const event = findEventSummary(await listTrips(), normalizedSlug);
  if (!event) {
    return null;
  }

  const allPhotos = await listAllGalleryPhotos();
  const filtered = filterGalleryPhotos(
    filterGalleryPhotosByTrip(
      filterGalleryPhotosByMediaType(allPhotos, "all"),
      event.tripName,
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
    event.coverUrl,
  );

  return (
    <div className="space-y-8">
      <GuestGalleryAlbumHero images={heroImages} title={event.label} />

      <GalleryWithFilter
        key={normalizedSlug}
        initialItems={items}
        initialViewerItems={viewerItems}
        initialHasNext={hasNext}
        pageSize={PAGE_SIZE}
        initialKeyword={keyword}
        trip={event.tripName}
        emptyMessage={galleryCopy.events.noPhotos(event.label)}
        showTagFilter
      />
    </div>
  );
}
