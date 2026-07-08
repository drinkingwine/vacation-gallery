import type { GalleryItem } from "@/lib/gallery";
import { galleryPhotoEditPath } from "@/lib/edit-paths";

export const GALLERY_REFRESH_EVENT = "gallery:refresh";
export const GALLERY_HOME_READY_EVENT = "gallery:home-ready";

export function refreshGallery() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(GALLERY_REFRESH_EVENT));
  }
}

export function notifyGalleryHomeReady() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(GALLERY_HOME_READY_EVENT));
  }
}

export function requestGalleryPhotoEdit(item: GalleryItem, returnTo?: string) {
  const href = galleryPhotoEditPath(item, returnTo);
  if (!href || typeof window === "undefined") return;
  window.location.assign(href);
}
