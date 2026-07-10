import { filterGalleryPhotosByTag } from "@/lib/gallery-query";
import { isFavoritesTrip } from "@/lib/favorites-trip";
import { formatTagLabel, THING_PHOTO_TAGS } from "@/lib/photo-tags";
import type { GalleryPhoto } from "@/lib/types";

export type ThingSummary = {
  tag: string;
  label: string;
  photoCount: number;
  coverUrl: string | null;
};

export function galleryPhotosForThings(photos: GalleryPhoto[]) {
  return photos.filter((photo) => !isFavoritesTrip(photo.tripName));
}

export function buildThingsGalleryList(photos: GalleryPhoto[]): ThingSummary[] {
  const thingPhotos = galleryPhotosForThings(photos);

  return THING_PHOTO_TAGS.map((tag) => {
    const matches = filterGalleryPhotosByTag(thingPhotos, tag);
    const coverPhoto =
      matches.find((photo) => photo.mediaType !== "video") ?? matches[0];

    return {
      tag,
      label: formatTagLabel(tag),
      photoCount: matches.length,
      coverUrl: coverPhoto?.downloadUrl ?? null,
    };
  })
    .filter((thing) => thing.photoCount > 0)
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function thingGalleryPath(tag: string) {
  return `/things/${encodeURIComponent(tag)}`;
}
