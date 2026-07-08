export function pickRandomImageCoverUrl(
  photos: Array<{ mediaType?: string; downloadUrl?: string }>,
): string | null {
  const images = photos.filter(
    (photo) => photo.mediaType !== "video" && photo.downloadUrl,
  );
  const pool =
    images.length > 0
      ? images
      : photos.filter((photo) => photo.downloadUrl);
  if (pool.length === 0) return null;

  const index = Math.floor(Math.random() * pool.length);
  return pool[index]!.downloadUrl!;
}
