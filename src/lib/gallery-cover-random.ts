import { isVideo } from "@/lib/media";

function isImageCoverPhoto(photo: {
  mediaType?: string;
  downloadUrl?: string;
  name?: string;
}): boolean {
  if (!photo.downloadUrl) return false;
  if (photo.mediaType === "video") return false;
  if (photo.name && isVideo(photo.name)) return false;
  if (isVideo(photo.downloadUrl)) return false;
  return true;
}

/** Picks a random still image URL. Never returns a video. */
export function pickRandomImageCoverUrl(
  photos: Array<{ mediaType?: string; downloadUrl?: string; name?: string }>,
): string | null {
  const images = photos.filter(isImageCoverPhoto);
  if (images.length === 0) return null;

  const index = Math.floor(Math.random() * images.length);
  return images[index]!.downloadUrl!;
}
