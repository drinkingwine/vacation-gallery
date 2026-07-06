export const MAX_HERO_IMAGES = 8;

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
