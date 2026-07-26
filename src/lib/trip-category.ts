export type TripCategory = "ralph" | "robin" | "r&r";

export type TripCategoryFilter = "all" | TripCategory;

export const TRIP_CATEGORY_OPTIONS = [
  { value: "ralph" as const, label: "Ralph" },
  { value: "robin" as const, label: "Robin" },
  { value: "r&r" as const, label: "R&R" },
] as const;

/** Chip order on the Vacations page: All · Ralph · Robin · R&R */
export const TRIP_CATEGORY_FILTER_OPTIONS = [
  { value: "all" as const, label: "All" },
  ...TRIP_CATEGORY_OPTIONS,
] as const;

export function parseTripCategory(value: unknown): TripCategory | undefined {
  if (value === "ralph" || value === "robin" || value === "r&r") return value;
  // Legacy dive tag → Ralph
  if (value === "dive") return "ralph";
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
  categories?: ReadonlyArray<string> | null;
  category?: string | ReadonlyArray<string> | null;
}): TripCategory[] {
  if (trip.categories != null) return parseTripCategories(trip.categories);
  return parseTripCategories(trip.category);
}

/** @deprecated Prefer getTripCategories — kept for single-value call sites. */
export function getTripCategory(trip: {
  categories?: ReadonlyArray<string> | null;
  category?: string | ReadonlyArray<string> | null;
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

export function tripCategoryFilterLabel(filter: TripCategoryFilter): string {
  if (filter === "all") return "trips";
  if (filter === "ralph") return "Ralph trips";
  if (filter === "robin") return "Robin trips";
  return "R&R trips";
}

/** Ralph / Robin / R&R match trips that include that tag. Untagged trips appear under All. */
export function matchesTripCategoryFilter(
  trip: {
    categories?: ReadonlyArray<string> | null;
    category?: string | ReadonlyArray<string> | null;
  },
  filter: TripCategoryFilter,
): boolean {
  if (filter === "all") return true;
  return getTripCategories(trip).includes(filter);
}
