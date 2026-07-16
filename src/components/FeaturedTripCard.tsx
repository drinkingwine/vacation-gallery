"use client";

import Link from "next/link";
import { SpotlightCard } from "@/components/SpotlightCard";
import { formatDateRange } from "@/lib/trip-meta";
import { formatMediaCountFromTrip } from "@/lib/media-count";
import type { Trip } from "@/lib/types";

type FeaturedTripCardProps = {
  trip: Trip;
  isAdmin?: boolean;
  onDelete?: (trip: Trip) => void;
  deleting?: boolean;
};

export function FeaturedTripCard({
  trip,
  isAdmin = false,
  onDelete,
  deleting = false,
}: FeaturedTripCardProps) {
  const dates = formatDateRange(trip.startDate, trip.endDate);

  return (
    <div className="group relative">
      <Link
        href={`/trips/${encodeURIComponent(trip.name)}`}
        className="block"
      >
        <SpotlightCard className="h-full min-h-[280px]">
          <div className="relative flex h-full min-h-[280px] flex-col justify-between gap-6 p-6">
            {trip.coverUrl ? (
              <div
                className="absolute inset-0 bg-cover bg-center opacity-20 dark:opacity-30"
                style={{ backgroundImage: `url(${trip.coverUrl})` }}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 opacity-30 dark:opacity-70" />
            )}
            <div className="relative z-10 space-y-4">
              {trip.location ? (
                <span className="hidden text-xs text-zinc-600/80 dark:text-white/60 md:inline">
                  {trip.location}
                </span>
              ) : null}
              <h3 className="text-2xl font-semibold text-zinc-900 dark:text-white">
                {trip.title}
              </h3>
              {trip.description ? (
                <p className="hidden line-clamp-2 text-sm text-zinc-600/80 dark:text-white/60 md:block">
                  {trip.description}
                </p>
              ) : dates ? (
                <p className="hidden text-xs text-zinc-600/80 dark:text-white/60 md:block">
                  {dates}
                </p>
              ) : null}
            </div>
            <div className="relative z-10 text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-white/50">
              {formatMediaCountFromTrip(trip)}
            </div>
          </div>
        </SpotlightCard>
      </Link>

      {isAdmin && onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onDelete(trip);
          }}
          disabled={deleting}
          className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/60 px-2.5 py-1 text-xs text-white opacity-0 backdrop-blur transition-opacity hover:bg-red-600 group-hover:opacity-100 disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
      )}
    </div>
  );
}
