type MediaLike = { mediaType?: "photo" | "video" };

export function countMedia(items: MediaLike[]) {
  let photos = 0;
  let videos = 0;
  for (const item of items) {
    if (item.mediaType === "video") videos++;
    else photos++;
  }
  return { photos, videos, total: photos + videos };
}

export function formatMediaCount(items: MediaLike[]): string {
  const { photos, videos } = countMedia(items);
  if (photos && videos) {
    return `${photos} photo${photos !== 1 ? "s" : ""}, ${videos} video${videos !== 1 ? "s" : ""}`;
  }
  if (videos) return `${videos} video${videos !== 1 ? "s" : ""}`;
  return `${photos} photo${photos !== 1 ? "s" : ""}`;
}

export function totalMediaCount(trip: {
  photoCount: number;
  videoCount?: number;
}): number {
  return trip.photoCount + (trip.videoCount ?? 0);
}

export function formatMediaCountFromTrip(trip: {
  photoCount: number;
  videoCount?: number;
}): string {
  const photos = trip.photoCount;
  const videos = trip.videoCount ?? 0;
  if (photos && videos) {
    return `${photos} photo${photos !== 1 ? "s" : ""}, ${videos} video${videos !== 1 ? "s" : ""}`;
  }
  if (videos) return `${videos} video${videos !== 1 ? "s" : ""}`;
  return `${photos} photo${photos !== 1 ? "s" : ""}`;
}
