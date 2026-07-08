"use client";

import { useMemo } from "react";
import { TimelineSpanChart } from "@/components/timeline/TimelineSpanChart";
import { TimelineTripCard } from "@/components/timeline/TimelineTripCard";
import { TripCard } from "@/components/TripCard";
import {
  groupTimelineByYear,
  partitionTimelineTrips,
} from "@/lib/timeline";
import type { Trip } from "@/lib/types";

type TripTimelineProps = {
  trips: Trip[];
};

export function TripTimeline({ trips }: TripTimelineProps) {
  const { dated, undated } = useMemo(
    () => partitionTimelineTrips(trips),
    [trips],
  );
  const yearGroups = useMemo(() => groupTimelineByYear(dated), [dated]);

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
        <section key={year} className="relative space-y-10">
          <div className="sticky top-28 z-10 -mx-2 flex items-center gap-4 bg-background/85 px-2 py-2 backdrop-blur-sm">
            <h2 className="font-serif text-3xl font-semibold text-zinc-800 dark:text-zinc-100">
              {year}
            </h2>
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          </div>

          <div className="relative space-y-12 sm:pl-0">
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
          <h2 className="font-serif text-2xl font-semibold text-zinc-800 dark:text-zinc-100">
            Undated trips
          </h2>
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
