import type { GalleryPhoto, Photo, Trip } from "@/lib/types";
import { FAVORITE_TAG } from "@/lib/photo-tags";

export type GalleryItem = {
  id: string;
  type: "photo" | "video";
  src: string;
  title: string;
  filename: string;
  path: string;
  sha: string;
  description?: string | null;
  locationName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  dateShot?: string | null;
  dateTaken?: string | null;
  createdAt?: string | null;
  tags?: string[];
  size?: number | null;
  width?: number | null;
  height?: number | null;
  blurHash?: string | null;
  tripName?: string;
  tripTitle?: string | null;
  sourceTrip?: string;
  sourcePath?: string;
};

export function buildGalleryItem(photo: GalleryPhoto): GalleryItem {
  const title = photo.caption?.trim() || photo.name;

  return {
    id: photo.id,
    type: photo.mediaType === "video" ? "video" : "photo",
    src: photo.downloadUrl,
    title,
    filename: photo.name,
    path: photo.path,
    sha: photo.sha,
    description: photo.caption ?? null,
    locationName: photo.location ?? photo.tripLocation ?? null,
    latitude: photo.latitude ?? null,
    longitude: photo.longitude ?? null,
    dateShot: photo.dateTaken ?? photo.tripStartDate ?? null,
    dateTaken: photo.dateTaken ?? null,
    createdAt: photo.dateTaken ?? photo.tripStartDate ?? null,
    tags: photo.tags ?? [],
    size: photo.size,
    width: photo.width ?? null,
    height: photo.height ?? null,
    blurHash: photo.blurHash ?? null,
    tripName: photo.tripName,
    tripTitle: photo.tripTitle ?? null,
    sourceTrip: photo.sourceTrip,
    sourcePath: photo.sourcePath,
  };
}

export function buildGalleryItems(photos: GalleryPhoto[]): GalleryItem[] {
  return photos.map(buildGalleryItem);
}

export function getItemDisplayTags(item: GalleryItem, max = 4) {
  const auto = new Set(
    [item.tripName, item.tripTitle, item.locationName]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.toLowerCase()),
  );

  return (item.tags ?? [])
    .filter((tag) => !auto.has(tag.toLowerCase()))
    .slice(0, max);
}

export function itemHasAssignedTags(item: GalleryItem) {
  return (item.tags ?? []).some(
    (tag) => tag.toLowerCase() !== FAVORITE_TAG,
  );
}

export function findPhotoByName(photos: Photo[], photoName: string) {
  const decoded = decodeURIComponent(photoName);
  return (
    photos.find((photo) => photo.name === photoName) ??
    photos.find((photo) => photo.name === decoded) ??
    photos.find((photo) => photo.name.toLowerCase() === photoName.toLowerCase()) ??
    photos.find((photo) => photo.name.toLowerCase() === decoded.toLowerCase())
  );
}

export function getEditablePhotoTags(
  photo: Photo,
  trip?: Pick<Trip, "name" | "title" | "location" | "startDate"> | null,
) {
  const tags = (photo.tags ?? []).filter(
    (tag) => tag.toLowerCase() !== FAVORITE_TAG,
  );

  if (!trip) return tags;

  return stripAutoPhotoTags(tags, photo, trip);
}

export function stripAutoPhotoTags(
  tags: string[],
  photo: Pick<Photo, "location">,
  trip?: Pick<Trip, "name" | "title" | "location"> | null,
) {
  const auto = new Set(
    [trip?.name, trip?.title, trip?.location, photo.location]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.toLowerCase()),
  );

  return tags.filter((tag) => !auto.has(tag.toLowerCase()));
}
