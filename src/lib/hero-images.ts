import { filterGalleryPhotosByTag } from "@/lib/gallery-query";
import type { GalleryHomePhoto } from "@/lib/gallery-home-data";
import { formatPhotoTimestamp } from "@/lib/photo-details";
import type { GalleryPhoto } from "@/lib/types";

export const MAX_HERO_IMAGES = 8;

export const HOME_HERO_TAG = "r&r";

export type HomeHeroSlide = {
  src: string;
  tripTitle: string;
  location: string | null;
  date: string | null;
};

function shuffleSlides<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function pickHeroImages(
  imageUrls: string[],
  preferredCover?: string | null,
): string[] {
  const urls = imageUrls.filter(Boolean);
  if (urls.length === 0) return [];

  if (preferredCover && urls.includes(preferredCover)) {
    return [preferredCover, ...urls.filter((url) => url !== preferredCover)].slice(
      0,
      MAX_HERO_IMAGES,
    );
  }

  return urls.slice(0, MAX_HERO_IMAGES);
}

export function buildTaggedHeroSlides(
  photos: GalleryHomePhoto[],
  tag: string = HOME_HERO_TAG,
): HomeHeroSlide[] {
  const slides = filterGalleryPhotosByTag(photos as GalleryPhoto[], tag)
    .filter((photo) => photo.mediaType !== "video")
    .map((photo) => ({
      src: photo.downloadUrl,
      tripTitle: photo.tripTitle || photo.tripName.replace(/-/g, " "),
      location: photo.location?.trim() || photo.tripLocation?.trim() || null,
      date: formatPhotoTimestamp(photo.dateTaken) ?? null,
    }))
    .filter((slide) => slide.src);

  return shuffleSlides(slides).slice(0, MAX_HERO_IMAGES);
}
