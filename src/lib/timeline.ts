import { isFavoritesTrip } from "@/lib/favorites-trip";
import type { Trip } from "@/lib/types";

export type TripTimelineSpan = {
  trip: Trip;
  startMs: number;
  endMs: number;
  year: number;
};

function parseTripDate(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value,
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getTripTimelineSpan(
  trip: Pick<Trip, "startDate" | "endDate">,
): { startMs: number; endMs: number } | null {
  const start = parseTripDate(trip.startDate);
  if (!start) return null;

  const end = parseTripDate(trip.endDate) ?? start;
  const startMs = start.getTime();
  const endMs = Math.max(end.getTime(), startMs);

  return { startMs, endMs };
}

export function partitionTimelineTrips(trips: Trip[]) {
  const dated: TripTimelineSpan[] = [];
  const undated: Trip[] = [];

  for (const trip of trips) {
    if (isFavoritesTrip(trip.name)) continue;

    const span = getTripTimelineSpan(trip);
    if (!span) {
      undated.push(trip);
      continue;
    }

    dated.push({
      trip,
      startMs: span.startMs,
      endMs: span.endMs,
      year: new Date(span.startMs).getFullYear(),
    });
  }

  dated.sort((a, b) => a.startMs - b.startMs);
  undated.sort((a, b) => a.title.localeCompare(b.title));

  return { dated, undated };
}

export function groupTimelineByYear(spans: TripTimelineSpan[]) {
  const groups = new Map<number, TripTimelineSpan[]>();

  for (const span of spans) {
    const existing = groups.get(span.year) ?? [];
    existing.push(span);
    groups.set(span.year, existing);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, yearSpans]) => [
      year,
      [...yearSpans].sort((a, b) => a.startMs - b.startMs),
    ] as const);
}

export function getTimelineBounds(spans: TripTimelineSpan[]) {
  if (spans.length === 0) return null;

  let minMs = spans[0]!.startMs;
  let maxMs = spans[0]!.endMs;

  for (const span of spans) {
    minMs = Math.min(minMs, span.startMs);
    maxMs = Math.max(maxMs, span.endMs);
  }

  const padding = Math.max((maxMs - minMs) * 0.04, 1000 * 60 * 60 * 24 * 14);
  return {
    minMs: minMs - padding,
    maxMs: maxMs + padding,
    spanMs: maxMs - minMs + padding * 2,
  };
}

export function assignTimelineRows(spans: TripTimelineSpan[]) {
  const sorted = [...spans].sort((a, b) => a.startMs - b.startMs);
  const assignments = new Map<string, number>();

  for (const span of sorted) {
    assignments.set(span.trip.path, 0);
  }

  return { rowCount: sorted.length > 0 ? 1 : 0, assignments };
}

export function timelineYearTicks(minMs: number, maxMs: number) {
  const startYear = new Date(minMs).getFullYear();
  const endYear = new Date(maxMs).getFullYear();
  const ticks: { year: number; leftPercent: number }[] = [];

  for (let year = startYear; year <= endYear; year++) {
    const yearStart = new Date(year, 0, 1).getTime();
    const leftPercent = ((yearStart - minMs) / (maxMs - minMs)) * 100;
    if (leftPercent >= 0 && leftPercent <= 100) {
      ticks.push({ year, leftPercent });
    }
  }

  return ticks;
}
