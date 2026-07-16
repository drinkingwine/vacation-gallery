import { filterGalleryPhotosByTag } from "@/lib/gallery-query";
import { isFavoritesTrip } from "@/lib/favorites-trip";
import { formatTagLabel, PEOPLE_PHOTO_TAGS } from "@/lib/photo-tags";
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

export function buildPeopleGalleryList(photos: GalleryPhoto[]): PersonSummary[] {
  const peoplePhotos = galleryPhotosForPeople(photos);

  return PEOPLE_PHOTO_TAGS.map((tag) => {
    const matches = filterGalleryPhotosByTag(peoplePhotos, tag);
    const coverPhoto =
      matches.find((photo) => photo.mediaType !== "video") ?? matches[0];

    return {
      tag,
      label: formatTagLabel(tag),
      photoCount: matches.length,
      coverUrl: coverPhoto?.downloadUrl ?? null,
    };
  })
    .filter((person) => person.photoCount > 0)
    .sort(
      (a, b) =>
        b.photoCount - a.photoCount || a.label.localeCompare(b.label),
    );
}

export function personGalleryPath(tag: string) {
  return `/people/${encodeURIComponent(tag)}`;
}
