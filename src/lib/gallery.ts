import type { GalleryPhoto } from "@/lib/types";

export type GalleryItem = {
  id: string;
  type: "photo";
  src: string;
  title: string;
  description?: string | null;
  locationName?: string | null;
  dateShot?: string | null;
  createdAt?: string | null;
  tags?: string[];
  size?: number | null;
  width?: number | null;
  height?: number | null;
  blurHash?: string | null;
  tripName?: string;
};

export function buildGalleryItem(photo: GalleryPhoto): GalleryItem {
  const title = photo.caption?.trim() || photo.name;
  const tags = [photo.tripTitle, photo.tripLocation].filter(
    (value): value is string => Boolean(value),
  );

  return {
    id: photo.id,
    type: "photo",
    src: photo.downloadUrl,
    title,
    description: photo.caption ?? null,
    locationName: photo.tripLocation ?? photo.tripTitle,
    dateShot: photo.tripStartDate ?? null,
    createdAt: photo.tripStartDate ?? null,
    tags: [...new Set(tags)],
    size: photo.size,
    tripName: photo.tripName,
  };
}

export function buildGalleryItems(photos: GalleryPhoto[]): GalleryItem[] {
  return photos.map(buildGalleryItem);
}
