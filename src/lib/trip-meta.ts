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

export function formatDateRange(startDate?: string, endDate?: string): string | null {
  if (!startDate) return null;

  const start = new Date(startDate + "T12:00:00");
  if (!endDate) {
    return start.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  const end = new Date(endDate + "T12:00:00");
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  const monthDay: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
  };
  const full: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
    year: "numeric",
  };

  if (sameMonth) {
    return `${start.toLocaleDateString("en-US", { month: "long", day: "numeric" })}–${end.getDate()}, ${end.getFullYear()}`;
  }

  if (sameYear) {
    return `${start.toLocaleDateString("en-US", monthDay)} – ${end.toLocaleDateString("en-US", full)}`;
  }

  return `${start.toLocaleDateString("en-US", full)} – ${end.toLocaleDateString("en-US", full)}`;
}

function parseTripDate(value?: string): number | null {
  if (!value) return null;
  const parsed = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value,
  );
  const time = parsed.getTime();
  return Number.isNaN(time) ? null : time;
}

export function getTripSortTime(trip: {
  startDate?: string;
  endDate?: string;
}): number | null {
  return parseTripDate(trip.endDate) ?? parseTripDate(trip.startDate);
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
