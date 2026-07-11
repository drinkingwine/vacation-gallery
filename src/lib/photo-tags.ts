export const FAVORITE_TAG = "favorite";

export const PRESET_PHOTO_TAG_SECTIONS = [
  {
    label: "Family",
    tags: ["allison", "keith", "r&r", "ralph", "robin", "rosemary"] as const,
  },
  {
    label: "Dive Buddies",
    tags: ["can't remember name", "ione", "kirk", "neil", "pete", "ron", "tom"] as const,
  },
  {
    label: "Pets",
    tags: ["arthur", "shannon"] as const,
  },
  {
    label: "Friends",
    tags: ["c&c", "chris", "claire"] as const,
  },
  {
    label: "Old Friends",
    tags: ["baby", "izzy"] as const,
  },
  {
    label: "Things",
    tags: [
      "birds",
      "boats",
      "cigars",
      "critters",
      "drinks",
      "earth",
      "fish",
      "food",
      "marine life",
      "plants",
      "pools",
      "shark bait",
    ] as const,
  },
] as const;

export const PRESET_PHOTO_TAGS = PRESET_PHOTO_TAG_SECTIONS.flatMap(
  (section) => section.tags,
);

export const PEOPLE_PHOTO_TAGS = PRESET_PHOTO_TAG_SECTIONS.filter(
  (section) => section.label !== "Things",
).flatMap((section) => section.tags);

export const THING_PHOTO_TAG_SECTION = PRESET_PHOTO_TAG_SECTIONS.find(
  (section) => section.label === "Things",
)!;

export const THING_PHOTO_TAGS = THING_PHOTO_TAG_SECTION.tags;

export type PresetPhotoTag = (typeof PRESET_PHOTO_TAGS)[number];
export type PeoplePhotoTag = (typeof PEOPLE_PHOTO_TAGS)[number];
export type ThingPhotoTag = (typeof THING_PHOTO_TAGS)[number];

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
  "r&r":
    "border-pink-300 bg-pink-100 text-pink-900 dark:border-pink-500/40 dark:bg-pink-500/15 dark:text-pink-100",
  tom: "border-orange-300 bg-orange-100 text-orange-900 dark:border-orange-500/40 dark:bg-orange-500/15 dark:text-orange-100",
  ron: "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100",
  kirk:
    "border-violet-300 bg-violet-100 text-violet-900 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-100",
  ione:
    "border-teal-300 bg-teal-100 text-teal-900 dark:border-teal-500/40 dark:bg-teal-500/15 dark:text-teal-100",
  neil: "border-cyan-300 bg-cyan-100 text-cyan-900 dark:border-cyan-500/40 dark:bg-cyan-500/15 dark:text-cyan-100",
  pete: "border-blue-300 bg-blue-100 text-blue-900 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-100",
  "can't remember name":
    "border-zinc-400 bg-zinc-100 text-zinc-900 dark:border-zinc-500/40 dark:bg-zinc-500/15 dark:text-zinc-100",
  arthur:
    "border-stone-300 bg-stone-100 text-stone-900 dark:border-stone-500/40 dark:bg-stone-500/15 dark:text-stone-100",
  shannon:
    "border-yellow-300 bg-yellow-100 text-yellow-900 dark:border-yellow-500/40 dark:bg-yellow-500/15 dark:text-yellow-100",
  claire:
    "border-fuchsia-300 bg-fuchsia-100 text-fuchsia-900 dark:border-fuchsia-500/40 dark:bg-fuchsia-500/15 dark:text-fuchsia-100",
  chris:
    "border-indigo-300 bg-indigo-100 text-indigo-900 dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-100",
  "c&c":
    "border-sky-400 bg-sky-100 text-sky-950 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-100",
  baby:
    "border-rose-400 bg-rose-100 text-rose-950 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-100",
  izzy:
    "border-lime-400 bg-lime-100 text-lime-950 dark:border-lime-500/40 dark:bg-lime-500/15 dark:text-lime-100",
  "shark bait":
    "border-red-300 bg-red-100 text-red-900 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-100",
  fish: "border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-100",
  cigars:
    "border-amber-400 bg-amber-100 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100",
  drinks:
    "border-violet-300 bg-violet-100 text-violet-900 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-100",
  pools:
    "border-cyan-300 bg-cyan-100 text-cyan-900 dark:border-cyan-500/40 dark:bg-cyan-500/15 dark:text-cyan-100",
  critters:
    "border-lime-300 bg-lime-100 text-lime-900 dark:border-lime-500/40 dark:bg-lime-500/15 dark:text-lime-100",
  birds:
    "border-yellow-400 bg-yellow-100 text-yellow-950 dark:border-yellow-500/40 dark:bg-yellow-500/15 dark:text-yellow-100",
  boats:
    "border-slate-300 bg-slate-100 text-slate-900 dark:border-slate-500/40 dark:bg-slate-500/15 dark:text-slate-100",
  earth:
    "border-emerald-400 bg-emerald-100 text-emerald-950 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-100",
  plants:
    "border-green-400 bg-green-100 text-green-950 dark:border-green-500/40 dark:bg-green-500/15 dark:text-green-100",
  food:
    "border-orange-300 bg-orange-50 text-orange-950 dark:border-orange-500/40 dark:bg-orange-500/15 dark:text-orange-100",
  "marine life":
    "border-blue-400 bg-blue-100 text-blue-950 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-100",
};

const FALLBACK_PRESET_TAG_CLASSES =
  "border-zinc-300 bg-zinc-100 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200";

export function isPresetPhotoTag(tag: string): tag is PresetPhotoTag {
  return PRESET_PHOTO_TAGS.includes(tag.toLowerCase() as PresetPhotoTag);
}

export function isPeoplePhotoTag(tag: string): tag is PeoplePhotoTag {
  return PEOPLE_PHOTO_TAGS.includes(tag.toLowerCase() as PeoplePhotoTag);
}

export function isThingPhotoTag(tag: string): tag is ThingPhotoTag {
  return THING_PHOTO_TAGS.includes(tag.toLowerCase() as ThingPhotoTag);
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

const TAG_LABEL_OVERRIDES: Record<string, string> = {
  "r&r": "R&R",
  "c&c": "C&C",
  "can't remember name": "Can't Remember Name",
};

export function formatTagLabel(tag: string) {
  if (tag.toLowerCase() === FAVORITE_TAG) return "Favorite";
  const lower = tag.toLowerCase();
  if (TAG_LABEL_OVERRIDES[lower]) return TAG_LABEL_OVERRIDES[lower]!;
  return tag
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
