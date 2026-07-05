export const FAVORITE_TAG = "favorite";

export function hasFavoriteTag(tags?: string[]) {
  return (tags ?? []).some((tag) => tag.toLowerCase() === FAVORITE_TAG);
}

export function formatTagLabel(tag: string) {
  if (tag.toLowerCase() === FAVORITE_TAG) return "Favorite";
  return tag;
}
