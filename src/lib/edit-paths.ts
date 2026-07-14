import type { GalleryItem } from "@/lib/gallery";

export function tripEditPath(tripName: string) {
  return `/trips/${encodeURIComponent(tripName)}/edit`;
}

export function photoEditPath(
  tripName: string,
  photoName: string,
  returnTo?: string,
) {
  const base = `/trips/${encodeURIComponent(tripName)}/photos/${encodeURIComponent(photoName)}/edit`;
  if (!returnTo) return base;
  return `${base}?from=${encodeURIComponent(returnTo)}`;
}

export function galleryPhotoEditPath(item: GalleryItem, returnTo?: string) {
  if (!item.tripName) return null;
  return photoEditPath(item.tripName, item.filename, returnTo);
}

export function videoWatchPath(
  tripName: string,
  videoName: string,
  returnTo?: string,
) {
  const base = `/trips/${encodeURIComponent(tripName)}/videos/${encodeURIComponent(videoName)}`;
  if (!returnTo) return base;
  return `${base}?from=${encodeURIComponent(returnTo)}`;
}

export function galleryVideoWatchPath(item: GalleryItem, returnTo?: string) {
  if (!item.tripName) return null;
  return videoWatchPath(item.tripName, item.filename, returnTo);
}
