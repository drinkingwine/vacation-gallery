"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  assignTimelineRows,
  getTimelineBounds,
  timelineYearAnchorPercents,
  timelineYearTicks,
  type TripTimelineSpan,
} from "@/lib/timeline";
import { getTripCountryFlag } from "@/lib/country-flags";
import { formatDateRange } from "@/lib/trip-meta";
import { cn } from "@/lib/utils";
import { timelineSurfaceClass } from "@/components/timeline/timeline-styles";

const ROW_HEIGHT = 80;
const CHART_PADDING = 48;
const ROW_GAP = 8;

type TimelineSpanChartProps = {
  spans: TripTimelineSpan[];
};

export function TimelineSpanChart({ spans }: TimelineSpanChartProps) {
  const sortedSpans = useMemo(
    () => [...spans].sort((a, b) => b.startMs - a.startMs),
    [spans],
  );
  const bounds = useMemo(() => getTimelineBounds(sortedSpans), [sortedSpans]);
  const { rowCount, assignments } = useMemo(
    () => assignTimelineRows(sortedSpans),
    [sortedSpans],
  );
  const yearAnchors = useMemo(
    () =>
      bounds
        ? timelineYearAnchorPercents(sortedSpans, bounds, "newest-first")
        : new Map<number, number>(),
    [bounds, sortedSpans],
  );
  const yearTicks = useMemo(
    () =>
      bounds
        ? timelineYearTicks(bounds.minMs, bounds.maxMs, "newest-first")
        : [],
    [bounds],
  );

  if (!bounds || sortedSpans.length === 0) return null;

  const chartHeight = rowCount * ROW_HEIGHT + CHART_PADDING;

  return (
    <section>
      <div
        className={cn(
          timelineSurfaceClass,
          "overflow-x-auto overflow-y-visible p-5 custom-scrollbar",
        )}
      >
        <TooltipProvider delayDuration={150}>
          <div
            className="relative min-w-[960px] px-6"
            style={{ height: chartHeight }}
          >
            <div className="absolute inset-x-0 bottom-8 top-10 border-b border-zinc-200 dark:border-zinc-700" />

            {yearTicks.map((tick) => (
              <div
                key={tick.year}
                className="absolute bottom-0 top-0"
                style={{ left: `${tick.leftPercent}%` }}
              >
                <div className="h-full w-px bg-zinc-200/80 dark:bg-zinc-700/80" />
                <span className="absolute bottom-0 left-1 text-[10px] font-medium tabular-nums text-zinc-400 dark:text-zinc-500">
                  {tick.year}
                </span>
              </div>
            ))}

            {sortedSpans.map((span) => {
              const centerPercent = yearAnchors.get(span.year) ?? 0;
              const row = assignments.get(span.trip.path) ?? 0;
              const dates = formatDateRange(
                span.trip.startDate,
                span.trip.endDate,
              );

              const flag = getTripCountryFlag(span.trip);
              const label = `${span.trip.title}${dates ? ` · ${dates}` : ""}`;

              return (
                <Tooltip key={span.trip.path}>
                  <TooltipTrigger asChild>
                    <Link
                      href={`/trips/${encodeURIComponent(span.trip.name)}`}
                      aria-label={label}
                      className={cn(
                        "group absolute flex w-12 -translate-x-1/2 flex-col items-center justify-center gap-1 transition",
                        "hover:z-20 hover:scale-110",
                      )}
                      style={{
                        left: `${centerPercent}%`,
                        top: 40 + row * ROW_HEIGHT,
                        height: ROW_HEIGHT - ROW_GAP,
                      }}
                    >
                      <span className="text-5xl leading-none" aria-hidden>
                        {flag}
                      </span>
                      <span className="text-xs font-medium tabular-nums text-zinc-500 dark:text-zinc-400">
                        {span.year}
                      </span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="top" collisionPadding={12}>
                    {label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </div>
    </section>
  );
}
