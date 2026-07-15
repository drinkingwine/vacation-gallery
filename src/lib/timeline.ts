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

  dated.sort((a, b) => b.startMs - a.startMs);
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
    .sort(([a], [b]) => b - a)
    .map(([year, yearSpans]) => [
      year,
      [...yearSpans].sort((a, b) => b.startMs - a.startMs),
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
  const sorted = [...spans].sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return b.startMs - a.startMs;
  });

  const assignments = new Map<string, number>();
  const nextRowByYear = new Map<number, number>();
  let rowCount = 0;

  for (const span of sorted) {
    const row = nextRowByYear.get(span.year) ?? 0;
    assignments.set(span.trip.path, row);
    nextRowByYear.set(span.year, row + 1);
    rowCount = Math.max(rowCount, row + 1);
  }

  return { rowCount, assignments };
}

/** Shared horizontal anchor per year so stacked same-year flags stay vertically aligned. */
export function timelineYearAnchorPercents(
  spans: TripTimelineSpan[],
  bounds: { minMs: number; maxMs: number; spanMs: number },
  order: "newest-first" | "oldest-first" = "newest-first",
) {
  const byYear = new Map<number, TripTimelineSpan[]>();
  for (const span of spans) {
    const list = byYear.get(span.year) ?? [];
    list.push(span);
    byYear.set(span.year, list);
  }

  const anchors = new Map<number, number>();
  for (const [year, yearSpans] of byYear) {
    let sumCenter = 0;
    for (const span of yearSpans) {
      sumCenter += (span.startMs + span.endMs) / 2;
    }
    const avgCenter = sumCenter / yearSpans.length;
    anchors.set(
      year,
      timelineCenterPercent(avgCenter, avgCenter, bounds, order),
    );
  }

  return anchors;
}

export function timelineCenterPercent(
  startMs: number,
  endMs: number,
  bounds: { minMs: number; maxMs: number; spanMs: number },
  order: "newest-first" | "oldest-first" = "newest-first",
) {
  const centerMs = (startMs + endMs) / 2;

  if (order === "newest-first") {
    return ((bounds.maxMs - centerMs) / bounds.spanMs) * 100;
  }

  return ((centerMs - bounds.minMs) / bounds.spanMs) * 100;
}

export function timelineYearTicks(
  minMs: number,
  maxMs: number,
  order: "newest-first" | "oldest-first" = "newest-first",
) {
  const startYear = new Date(minMs).getFullYear();
  const endYear = new Date(maxMs).getFullYear();
  const spanMs = maxMs - minMs;
  const ticks: { year: number; leftPercent: number }[] = [];

  for (let year = startYear; year <= endYear; year++) {
    const yearStart = new Date(year, 0, 1).getTime();
    const leftPercent =
      order === "newest-first"
        ? ((maxMs - yearStart) / spanMs) * 100
        : ((yearStart - minMs) / spanMs) * 100;
    if (leftPercent >= 0 && leftPercent <= 100) {
      ticks.push({ year, leftPercent });
    }
  }

  return ticks;
}
