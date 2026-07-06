import { GalleryAlbumHero } from "@/components/gallery/GalleryAlbumHero";
import { pickHeroImages } from "@/lib/hero-images";
import { GalleryWithFilter } from "@/components/gallery/GalleryWithFilter";
import { buildGalleryItems } from "@/lib/gallery";
import {
  filterGalleryPhotos,
  filterGalleryPhotosByMediaType,
  filterGalleryPhotosByPlace,
  paginateGalleryPhotos,
  sortGalleryPhotos,
} from "@/lib/gallery-query";
import { galleryCopy } from "@/lib/gallery-copy";
import { listAllGalleryPhotos, listTrips } from "@/lib/github";
import { findPlaceSummary } from "@/lib/places-gallery";

const PAGE_SIZE = 24;

type GalleryPlaceContentProps = {
  placeSlug: string;
  initialKeyword?: string;
};

export async function GalleryPlaceContent({
  placeSlug,
  initialKeyword = "",
}: GalleryPlaceContentProps) {
  const normalizedSlug = placeSlug.trim().toLowerCase();
  const keyword = initialKeyword.trim();
  const place = findPlaceSummary(await listTrips(), normalizedSlug);
  if (!place) {
    return null;
  }

  const allPhotos = await listAllGalleryPhotos();
  const filtered = filterGalleryPhotos(
    filterGalleryPhotosByPlace(
      filterGalleryPhotosByMediaType(allPhotos, "all"),
      normalizedSlug,
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
    place.coverUrl,
  );

  return (
    <div className="space-y-8">
      <GalleryAlbumHero
        images={heroImages}
        title={place.title}
        eyebrow={galleryCopy.places.eyebrow}
        badges={[
          { label: place.mediaLabel },
          ...(place.location ? [{ label: place.location }] : []),
        ]}
        subtitle={
          place.tripCount > 1 ? place.tripTitles.join(" · ") : undefined
        }
        backHref="/gallery/places"
        backLabel="All places"
      />

      <GalleryWithFilter
        initialItems={items}
        initialViewerItems={viewerItems}
        initialHasNext={hasNext}
        pageSize={PAGE_SIZE}
        initialKeyword={keyword}
        place={normalizedSlug}
        emptyMessage={galleryCopy.places.noPhotos(place.title)}
      />
    </div>
  );
}
