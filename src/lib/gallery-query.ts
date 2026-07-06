import type { GalleryPhoto, GallerySortOrder } from "@/lib/types";
import { hasPhotoTag } from "@/lib/photo-tags";

export function sortGalleryPhotos(
  photos: GalleryPhoto[],
  sortOrder: GallerySortOrder,
) {
  return [...photos].sort((a, b) => {
    const aDate = a.tripStartDate ? new Date(a.tripStartDate).getTime() : 0;
    const bDate = b.tripStartDate ? new Date(b.tripStartDate).getTime() : 0;
    if (aDate !== bDate) {
      return sortOrder === "newest" ? bDate - aDate : aDate - bDate;
    }
    const cmp = a.name.localeCompare(b.name);
    return sortOrder === "newest" ? -cmp : cmp;
  });
}

export function filterGalleryPhotos(photos: GalleryPhoto[], keyword: string) {
  const q = keyword.trim().toLowerCase();
  if (!q) return photos;
  return photos.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.caption?.toLowerCase().includes(q) ||
      p.tripTitle.toLowerCase().includes(q) ||
      p.tripLocation?.toLowerCase().includes(q),
  );
}

export function filterGalleryPhotosByMediaType(
  photos: GalleryPhoto[],
  mediaType: string,
) {
  if (mediaType === "photo") {
    return photos.filter((p) => p.mediaType !== "video");
  }
  if (mediaType === "video") {
    return photos.filter((p) => p.mediaType === "video");
  }
  return photos;
}

export function filterGalleryPhotosByTag(photos: GalleryPhoto[], tag: string) {
  const normalized = tag.trim().toLowerCase();
  if (!normalized) return photos;
  return photos.filter((photo) => hasPhotoTag(photo.tags ?? [], normalized));
}

export function filterGalleryPhotosByTrip(photos: GalleryPhoto[], tripName: string) {
  const normalized = tripName.trim();
  if (!normalized) return photos;
  return photos.filter((photo) => photo.tripName === normalized);
}

export function paginateGalleryPhotos<T>(
  items: T[],
  page: number,
  pageSize: number,
) {
  const start = (page - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);
  return {
    items: slice,
    page,
    hasNext: start + pageSize < items.length,
    total: items.length,
  };
}
