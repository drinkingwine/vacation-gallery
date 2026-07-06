import { GalleryAlbumHero } from "@/components/gallery/GalleryAlbumHero";
import { pickHeroImages } from "@/lib/hero-images";
import { GalleryWithFilter } from "@/components/gallery/GalleryWithFilter";
import { buildGalleryItems } from "@/lib/gallery";
import {
  filterGalleryPhotos,
  filterGalleryPhotosByMediaType,
  filterGalleryPhotosByTag,
  paginateGalleryPhotos,
  sortGalleryPhotos,
} from "@/lib/gallery-query";
import { galleryCopy } from "@/lib/gallery-copy";
import { listAllGalleryPhotos } from "@/lib/github";
import { galleryPhotosForPeople } from "@/lib/people-gallery";
import { formatTagLabel } from "@/lib/photo-tags";

const PAGE_SIZE = 24;

type GalleryPersonContentProps = {
  tag: string;
  initialKeyword?: string;
};

export async function GalleryPersonContent({
  tag,
  initialKeyword = "",
}: GalleryPersonContentProps) {
  const normalizedTag = tag.trim().toLowerCase();
  const keyword = initialKeyword.trim();
  const allPhotos = galleryPhotosForPeople(await listAllGalleryPhotos());
  const filtered = filterGalleryPhotos(
    filterGalleryPhotosByTag(
      filterGalleryPhotosByMediaType(allPhotos, "all"),
      normalizedTag,
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
  const label = formatTagLabel(normalizedTag);
  const heroImages = pickHeroImages(
    viewerItems
      .filter((item) => item.type === "photo")
      .map((item) => item.src),
  );

  return (
    <div className="space-y-8">
      <GalleryAlbumHero
        images={heroImages}
        title={label}
        eyebrow={galleryCopy.people.eyebrow}
        badges={[
          {
            label: `${sorted.length} ${sorted.length === 1 ? "photo" : "photos"}`,
          },
        ]}
        backHref="/gallery/people"
        backLabel="All people"
      />

      <GalleryWithFilter
        initialItems={items}
        initialViewerItems={viewerItems}
        initialHasNext={hasNext}
        pageSize={PAGE_SIZE}
        initialKeyword={keyword}
        tag={normalizedTag}
        emptyMessage={galleryCopy.people.noPhotos(label)}
      />
    </div>
  );
}
