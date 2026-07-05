import type { GalleryPhoto } from "@/lib/types";

export type GalleryItem = {
  id: string;
  type: "photo";
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
  const metaTags = photo.tags ?? [];
  const autoTags = [photo.tripTitle, photo.tripLocation].filter(
    (value): value is string => Boolean(value),
  );

  return {
    id: photo.id,
    type: "photo",
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
    createdAt: photo.dateTaken ?? photo.tripStartDate ?? null,
    tags: [...new Set([...metaTags, ...autoTags])],
    size: photo.size,
    tripName: photo.tripName,
  };
}

export function buildGalleryItems(photos: GalleryPhoto[]): GalleryItem[] {
  return photos.map(buildGalleryItem);
}
