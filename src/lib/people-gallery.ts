import { filterGalleryPhotosByTag } from "@/lib/gallery-query";
import { pickRandomImageCoverUrl } from "@/lib/gallery-cover-random";
import { isFavoritesTrip } from "@/lib/favorites-trip";
import { formatTagLabel, PRESET_PHOTO_TAGS } from "@/lib/photo-tags";
import type { GalleryPhoto } from "@/lib/types";

export type PersonSummary = {
  tag: string;
  label: string;
  photoCount: number;
  coverUrl: string | null;
};

export function galleryPhotosForPeople(photos: GalleryPhoto[]) {
  return photos.filter((photo) => !isFavoritesTrip(photo.tripName));
}

export function buildPeopleGalleryList(
  photos: GalleryPhoto[],
  options?: { randomCovers?: boolean },
): PersonSummary[] {
  const peoplePhotos = galleryPhotosForPeople(photos);

  return PRESET_PHOTO_TAGS.map((tag) => {
    const matches = filterGalleryPhotosByTag(peoplePhotos, tag);
    const coverUrl = options?.randomCovers
      ? pickRandomImageCoverUrl(matches)
      : (matches.find((photo) => photo.mediaType !== "video") ??
          matches[0])?.downloadUrl ??
        null;

    return {
      tag,
      label: formatTagLabel(tag),
      photoCount: matches.length,
      coverUrl,
    };
  })
    .filter((person) => person.photoCount > 0)
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function personGalleryPath(tag: string) {
  return `/people/${encodeURIComponent(tag)}`;
}
