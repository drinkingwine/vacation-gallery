"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CoverImage,
  coverCountBadgeClass,
  coverFrameClass,
} from "@/components/gallery/CoverImage";
import { formatMediaCountFromTrip } from "@/lib/media-count";
import { formatDateRange } from "@/lib/trip-meta";
import type { Trip } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TimelineDateBadge } from "@/components/timeline/TimelineDateBadge";
import { timelineSurfaceClass } from "@/components/timeline/timeline-styles";

type TimelineTripCardProps = {
  trip: Trip;
  align?: "left" | "right";
  priority?: boolean;
};

export function TimelineTripCard({
  trip,
  align = "left",
  priority = false,
}: TimelineTripCardProps) {
  const cover = trip.coverUrl;
  const [coverLoaded, setCoverLoaded] = useState(false);
  const dates = formatDateRange(trip.startDate, trip.endDate);

  useEffect(() => {
    setCoverLoaded(false);
  }, [cover]);

  return (
    <article
      className={cn(
        timelineSurfaceClass,
        "relative grid w-full gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center",
        align === "right" && "sm:[&>*:first-child]:order-3 sm:[&>*:last-child]:order-1",
      )}
    >
      <div className={cn(align === "left" ? "sm:pr-4" : "sm:pl-4 sm:text-right")}>
        <div className={cn(align === "right" && "sm:ml-auto sm:max-w-sm")}>
          <Link
            href={`/trips/${encodeURIComponent(trip.name)}`}
            className="group block"
          >
            <div className={coverFrameClass(coverLoaded)}>
              {cover ? (
                <CoverImage
                  src={cover}
                  alt={trip.title}
                  unoptimized
                  priority={priority}
                  sizes="(max-width: 768px) 100vw, 280px"
                  onCoverLoad={() => setCoverLoaded(true)}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/80 to-purple-600/80">
                  <span className="px-4 text-center text-sm font-medium text-white">
                    {trip.title}
                  </span>
                </div>
              )}
              <div className={coverCountBadgeClass()}>
                {formatMediaCountFromTrip(trip)}
              </div>
            </div>
          </Link>
        </div>
      </div>

      <div className="hidden flex-col items-center sm:flex">
        <div className="h-3 w-3 rounded-full border-2 border-indigo-500 bg-white shadow-sm dark:bg-zinc-900" />
        <div className="mt-1 h-full min-h-4 w-px bg-gradient-to-b from-indigo-400/80 to-transparent" />
      </div>

      <div
        className={cn(
          "space-y-2 px-1",
          align === "right" ? "sm:pr-4 sm:text-right" : "sm:pl-4",
        )}
      >
        {dates ? (
          <TimelineDateBadge>{dates}</TimelineDateBadge>
        ) : (
          <TimelineDateBadge>Date unknown</TimelineDateBadge>
        )}
        <h3 className="font-serif text-2xl font-semibold text-zinc-800 dark:text-zinc-100">
          <Link
            href={`/trips/${encodeURIComponent(trip.name)}`}
            className="transition hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            {trip.title}
          </Link>
        </h3>
        {trip.location ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{trip.location}</p>
        ) : null}
        {trip.description ? (
          <p className="line-clamp-3 text-sm text-zinc-600 dark:text-zinc-300">
            {trip.description}
          </p>
        ) : null}
      </div>
    </article>
  );
}
