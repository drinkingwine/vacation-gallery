export const FAVORITE_TAG = "favorite";

export const PRESET_PHOTO_TAG_SECTIONS = [
  {
    label: "Family",
    tags: ["ralph", "robin", "rosemary", "keith", "allison"] as const,
  },
  {
    label: "Dive Buddies",
    tags: ["tom", "ron", "kirk", "ione", "neil"] as const,
  },
  {
    label: "Pets",
    tags: ["arthur", "shannon"] as const,
  },
  {
    label: "Misc",
    tags: ["shark bait", "fish", "cigars", "drinks", "pools"] as const,
  },
] as const;

export const PRESET_PHOTO_TAGS = PRESET_PHOTO_TAG_SECTIONS.flatMap(
  (section) => section.tags,
);

export type PresetPhotoTag = (typeof PRESET_PHOTO_TAGS)[number];

const PRESET_TAG_COLOR_CLASSES: Record<PresetPhotoTag, string> = {
  ralph:
    "border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-100",
  robin:
    "border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-100",
  rosemary:
    "border-green-300 bg-green-100 text-green-900 dark:border-green-500/40 dark:bg-green-500/15 dark:text-green-100",
  keith:
    "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-100",
  allison:
    "border-purple-300 bg-purple-100 text-purple-900 dark:border-purple-500/40 dark:bg-purple-500/15 dark:text-purple-100",
  tom: "border-orange-300 bg-orange-100 text-orange-900 dark:border-orange-500/40 dark:bg-orange-500/15 dark:text-orange-100",
  ron: "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100",
  kirk:
    "border-violet-300 bg-violet-100 text-violet-900 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-100",
  ione:
    "border-teal-300 bg-teal-100 text-teal-900 dark:border-teal-500/40 dark:bg-teal-500/15 dark:text-teal-100",
  neil: "border-cyan-300 bg-cyan-100 text-cyan-900 dark:border-cyan-500/40 dark:bg-cyan-500/15 dark:text-cyan-100",
  arthur:
    "border-stone-300 bg-stone-100 text-stone-900 dark:border-stone-500/40 dark:bg-stone-500/15 dark:text-stone-100",
  shannon:
    "border-yellow-300 bg-yellow-100 text-yellow-900 dark:border-yellow-500/40 dark:bg-yellow-500/15 dark:text-yellow-100",
  "shark bait":
    "border-red-300 bg-red-100 text-red-900 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-100",
  fish: "border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-100",
  cigars:
    "border-amber-400 bg-amber-100 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100",
  drinks:
    "border-violet-300 bg-violet-100 text-violet-900 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-100",
  pools:
    "border-cyan-300 bg-cyan-100 text-cyan-900 dark:border-cyan-500/40 dark:bg-cyan-500/15 dark:text-cyan-100",
};

const FALLBACK_PRESET_TAG_CLASSES =
  "border-zinc-300 bg-zinc-100 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200";

export function isPresetPhotoTag(tag: string): tag is PresetPhotoTag {
  return PRESET_PHOTO_TAGS.includes(tag.toLowerCase() as PresetPhotoTag);
}

export function getPresetTagColorClasses(tag: string) {
  const lower = tag.toLowerCase();
  if (isPresetPhotoTag(lower)) {
    return PRESET_TAG_COLOR_CLASSES[lower];
  }
  return FALLBACK_PRESET_TAG_CLASSES;
}

export function hasFavoriteTag(tags?: string[]) {
  return (tags ?? []).some((tag) => tag.toLowerCase() === FAVORITE_TAG);
}

export function hasPhotoTag(tags: string[], tag: string) {
  const lower = tag.toLowerCase();
  return tags.some((value) => value.toLowerCase() === lower);
}

export function formatTagLabel(tag: string) {
  if (tag.toLowerCase() === FAVORITE_TAG) return "Favorite";
  return tag
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
