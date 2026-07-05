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
