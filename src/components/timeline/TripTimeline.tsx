"use client";

import { useMemo } from "react";
import { TimelineSpanChart } from "@/components/timeline/TimelineSpanChart";
import { TimelineTripCard } from "@/components/timeline/TimelineTripCard";
import { TripCard } from "@/components/TripCard";
import {
  groupTimelineByYear,
  partitionTimelineTrips,
  type TripTimelineSpan,
} from "@/lib/timeline";
import { getUniqueTripFlags } from "@/lib/country-flags";
import { TimelineDateBadge } from "@/components/timeline/TimelineDateBadge";
import { timelineSurfaceClass } from "@/components/timeline/timeline-styles";
import type { Trip } from "@/lib/types";
import { cn } from "@/lib/utils";

type TripTimelineProps = {
  trips: Trip[];
};

function TimelineYearHeader({
  label,
  spans,
}: {
  label: string;
  spans: TripTimelineSpan[];
}) {
  const flags = useMemo(
    () => getUniqueTripFlags(spans.map((span) => span.trip)),
    [spans],
  );

  return (
    <div
      className={cn(
        timelineSurfaceClass,
        "sticky top-28 z-10 flex flex-wrap items-center gap-3 px-5 py-4",
      )}
    >
      <TimelineDateBadge variant="year">{label}</TimelineDateBadge>
      {flags.length > 0 ? (
        <div
          className="relative flex items-center"
          style={{
            width: flags.length > 1 ? `${1.75 + (flags.length - 1) * 0.85}rem` : "1.75rem",
            height: flags.length > 1 ? `${1.75 + (flags.length - 1) * 0.55}rem` : "1.75rem",
          }}
          aria-hidden
        >
          {flags.map((flag, index) => (
            <span
              key={`${flag}-${index}`}
              className="absolute text-3xl leading-none drop-shadow-sm"
              style={{
                left: `${index * 0.85}rem`,
                top: `${index * 0.55}rem`,
                zIndex: flags.length - index,
              }}
            >
              {flag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function TripTimeline({ trips }: TripTimelineProps) {
  const { dated, undated } = useMemo(
    () => partitionTimelineTrips(trips),
    [trips],
  );
  const yearGroups = useMemo(() => groupTimelineByYear(dated), [dated]);
  const undatedFlags = useMemo(() => getUniqueTripFlags(undated), [undated]);

  if (dated.length === 0 && undated.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white/60 p-10 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
        No trips yet. Create a trip with dates to see it on the timeline.
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {dated.length > 0 ? <TimelineSpanChart spans={dated} /> : null}

      {yearGroups.map(([year, spans]) => (
        <section key={year} className="relative space-y-6">
          <TimelineYearHeader label={String(year)} spans={spans} />

          <div className="relative space-y-6 sm:pl-0">
            <div className="absolute bottom-0 left-1/2 top-0 hidden w-px -translate-x-1/2 bg-gradient-to-b from-indigo-300/60 via-zinc-200 to-transparent dark:from-indigo-500/40 dark:via-zinc-700 sm:block" />

            {spans.map((span, index) => (
              <TimelineTripCard
                key={span.trip.path}
                trip={span.trip}
                align={index % 2 === 0 ? "left" : "right"}
                priority={index < 2}
              />
            ))}
          </div>
        </section>
      ))}

      {undated.length > 0 ? (
        <section className="space-y-6">
          <div
            className={cn(
              timelineSurfaceClass,
              "flex flex-wrap items-center gap-3 px-5 py-4",
            )}
          >
            <TimelineDateBadge variant="year">Undated</TimelineDateBadge>
            {undatedFlags.length > 0 ? (
              <div
                className="relative flex items-center"
                style={{
                  width:
                    undatedFlags.length > 1
                      ? `${1.75 + (undatedFlags.length - 1) * 0.85}rem`
                      : "1.75rem",
                  height:
                    undatedFlags.length > 1
                      ? `${1.75 + (undatedFlags.length - 1) * 0.55}rem`
                      : "1.75rem",
                }}
                aria-hidden
              >
                {undatedFlags.map((flag, index) => (
                  <span
                    key={`${flag}-${index}`}
                    className="absolute text-3xl leading-none drop-shadow-sm"
                    style={{
                      left: `${index * 0.85}rem`,
                      top: `${index * 0.55}rem`,
                      zIndex: undatedFlags.length - index,
                    }}
                  >
                    {flag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {undated.map((trip, index) => (
              <TripCard key={trip.path} trip={trip} priority={index < 4} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
