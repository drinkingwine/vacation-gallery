import type { GalleryItem } from "@/lib/gallery";
import type { Photo } from "@/lib/types";

export function galleryItemToPhoto(item: GalleryItem): Photo {
  return {
    name: item.filename,
    path: item.path,
    sha: item.sha,
    downloadUrl: item.src,
    size: item.size ?? 0,
    caption: item.description ?? undefined,
    trip: item.tripName,
  };
}

export const GALLERY_REFRESH_EVENT = "gallery:refresh";
export const GALLERY_EDIT_EVENT = "gallery:edit-photo";

export function refreshGallery() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(GALLERY_REFRESH_EVENT));
  }
}

export function requestGalleryPhotoEdit(item: GalleryItem) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<GalleryItem>(GALLERY_EDIT_EVENT, { detail: item }),
    );
  }
}
