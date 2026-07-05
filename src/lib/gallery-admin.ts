import type { GalleryItem } from "@/lib/gallery";
import { galleryPhotoEditPath } from "@/lib/edit-paths";

export const GALLERY_REFRESH_EVENT = "gallery:refresh";

export function refreshGallery() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(GALLERY_REFRESH_EVENT));
  }
}

export function requestGalleryPhotoEdit(item: GalleryItem, returnTo?: string) {
  const href = galleryPhotoEditPath(item, returnTo);
  if (!href || typeof window === "undefined") return;
  window.location.assign(href);
}
