export type TripCategory = "dive" | "r&r";

export type TripCategoryFilter = "all" | TripCategory;

export const TRIP_CATEGORY_OPTIONS = [
  { value: "dive" as const, label: "Dive Trips" },
  { value: "r&r" as const, label: "R&R" },
] as const;

/** Chip order on the Vacations page: Dive Trips · R&R · All */
export const TRIP_CATEGORY_FILTER_OPTIONS = [
  ...TRIP_CATEGORY_OPTIONS,
  { value: "all" as const, label: "All" },
] as const;

export function parseTripCategory(value: unknown): TripCategory | undefined {
  if (value === "dive" || value === "r&r") return value;
  return undefined;
}

/** Accepts legacy single `category` or `categories` array. */
export function parseTripCategories(value: unknown): TripCategory[] {
  if (Array.isArray(value)) {
    const seen = new Set<TripCategory>();
    const categories: TripCategory[] = [];
    for (const entry of value) {
      const parsed = parseTripCategory(entry);
      if (!parsed || seen.has(parsed)) continue;
      seen.add(parsed);
      categories.push(parsed);
    }
    return categories;
  }

  const single = parseTripCategory(value);
  return single ? [single] : [];
}

export function getTripCategories(trip: {
  categories?: TripCategory[] | string[] | null;
  category?: TripCategory | TripCategory[] | string | null;
}): TripCategory[] {
  if (trip.categories != null) return parseTripCategories(trip.categories);
  return parseTripCategories(trip.category);
}

/** @deprecated Prefer getTripCategories — kept for single-value call sites. */
export function getTripCategory(trip: {
  categories?: TripCategory[] | string[] | null;
  category?: TripCategory | TripCategory[] | string | null;
}): TripCategory | undefined {
  return getTripCategories(trip)[0];
}

export function toggleTripCategory(
  categories: TripCategory[],
  value: TripCategory,
): TripCategory[] {
  return categories.includes(value)
    ? categories.filter((category) => category !== value)
    : [...categories, value];
}

/** Dive / R&R match trips that include that tag. Untagged trips appear under All. */
export function matchesTripCategoryFilter(
  trip: {
    categories?: TripCategory[] | string[] | null;
    category?: TripCategory | TripCategory[] | string | null;
  },
  filter: TripCategoryFilter,
): boolean {
  if (filter === "all") return true;
  return getTripCategories(trip).includes(filter);
}
