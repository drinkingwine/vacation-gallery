export function tripLabel(name: string): string {
  return name.replace(/-/g, " ");
}

export function tripDisplayTitle(trip: {
  name: string;
  title?: string;
}): string {
  return trip.title ?? tripLabel(trip.name);
}

export function toDateInputValue(value?: string | null): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function parseTripDateValue(value: string): Date | null {
  const parsed = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value,
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatTripDate(value?: string | null): string | null {
  if (!value) return null;
  const parsed = parseTripDateValue(value);
  if (!parsed) return null;

  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const year = parsed.getFullYear();
  return `${month}/${day}/${year}`;
}

function tripDurationDays(startDate: string, endDate: string): number | null {
  const start = parseTripDateValue(startDate);
  const end = parseTripDateValue(endDate);
  if (!start || !end) return null;

  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  const diff = Math.round((endUtc - startUtc) / (1000 * 60 * 60 * 24));
  if (diff < 0) return null;

  return diff + 1;
}

export function formatDateRange(startDate?: string, endDate?: string): string | null {
  if (!startDate) return null;

  const start = formatTripDate(startDate);
  if (!start) return null;
  if (!endDate) return start;

  const days = tripDurationDays(startDate, endDate);
  if (!days) return start;

  return `${start} · ${days} day${days === 1 ? "" : "s"}`;
}

export function getTripSortTime(trip: {
  startDate?: string;
  endDate?: string;
}): number | null {
  const end = trip.endDate ? parseTripDateValue(trip.endDate)?.getTime() : null;
  const start = trip.startDate ? parseTripDateValue(trip.startDate)?.getTime() : null;
  return end ?? start ?? null;
}

export function sortTripsByDateDesc<
  T extends { startDate?: string; endDate?: string; title: string },
>(trips: T[]): T[] {
  return [...trips].sort((a, b) => {
    const aTime = getTripSortTime(a);
    const bTime = getTripSortTime(b);

    if (aTime === null && bTime === null) {
      return a.title.localeCompare(b.title);
    }
    if (aTime === null) return 1;
    if (bTime === null) return -1;
    if (aTime !== bTime) return bTime - aTime;
    return a.title.localeCompare(b.title);
  });
}

export function sortTripsWithFavoritesFirst<
  T extends { name: string; startDate?: string; endDate?: string; title: string },
>(trips: T[]): T[] {
  const favorites = trips.filter((trip) => trip.name === "Favorites");
  const rest = sortTripsByDateDesc(
    trips.filter((trip) => trip.name !== "Favorites"),
  );
  return [...favorites, ...rest];
}
