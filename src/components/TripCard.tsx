"use client";

import Image from "next/image";
import Link from "next/link";
import { formatDateRange } from "@/lib/trip-meta";
import { totalMediaCount } from "@/lib/media-count";
import { cn } from "@/lib/utils";
import type { Trip } from "@/lib/types";

type TripCardProps = {
  trip: Trip;
  isAdmin?: boolean;
  onDelete?: (trip: Trip) => void;
  deleting?: boolean;
};

const stackTransforms = [
  { x: 0, y: 0, rotate: 0, opacity: 1 },
  { x: -6, y: -4, rotate: -4, opacity: 0.88 },
  { x: 8, y: -6, rotate: 5, opacity: 0.76 },
];

const stackHoverTransforms = [
  { x: 0, y: 0, rotate: 0, opacity: 1 },
  { x: -20, y: -16, rotate: -8, opacity: 1 },
  { x: 28, y: -20, rotate: 10, opacity: 1 },
];

export function TripCard({
  trip,
  isAdmin = false,
  onDelete,
  deleting = false,
}: TripCardProps) {
  const dates = formatDateRange(trip.startDate, trip.endDate);
  const cover = trip.coverUrl;

  return (
    <div className="group relative mt-2 block">
      <Link
        href={`/trips/${encodeURIComponent(trip.name)}`}
        className="block"
      >
        <div className="relative mb-4 aspect-video w-full">
          {cover ? (
            stackTransforms.map((transform, index) => (
              <div
                key={index}
                className={cn(
                  "absolute inset-0 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg transition-all duration-500 ease-out dark:border-zinc-800 dark:bg-zinc-800",
                  "group-hover:[transform:var(--hover-transform)]",
                )}
                style={
                  {
                    zIndex: 3 - index,
                    transform: `translate(${transform.x}px, ${transform.y}px) rotate(${transform.rotate}deg)`,
                    opacity: transform.opacity,
                    "--hover-transform": `translate(${stackHoverTransforms[index].x}px, ${stackHoverTransforms[index].y}px) rotate(${stackHoverTransforms[index].rotate}deg)`,
                  } as React.CSSProperties
                }
              >
                <Image
                  src={cover}
                  alt={trip.title}
                  fill
                  unoptimized
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover"
                />
                {index > 0 && (
                  <div className="absolute inset-0 bg-black/10 transition-opacity duration-300 group-hover:opacity-0 dark:bg-black/30" />
                )}
              </div>
            ))
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-white shadow-lg transition-shadow group-hover:shadow-xl dark:border-zinc-700 dark:from-zinc-800 dark:to-zinc-900">
              <svg
                className="h-10 w-10 text-zinc-400 dark:text-zinc-500"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M21 3H3a2 2 0 00-2 2v14a2 2 0 002 2h18a2 2 0 002-2V5a2 2 0 00-2-2zm0 16H3V5h18v14zm-5-7l-3 3.72L10 13l-4 5h12l-3-3z" />
              </svg>
            </div>
          )}
          <div className="absolute bottom-3 right-3 z-10 rounded-full border border-orange-400/60 bg-orange-500 px-2.5 py-1 text-[10px] font-semibold tabular-nums text-white shadow-sm">
            {totalMediaCount(trip)}
          </div>
        </div>

        <div className="px-2">
          <h2 className="line-clamp-2 text-lg font-semibold leading-snug text-zinc-800 transition-colors group-hover:text-indigo-600 dark:text-zinc-200 dark:group-hover:text-indigo-400">
            {trip.title}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {dates ?? "Trip album"}
          </p>
          {trip.location && (
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-500">
              {trip.location}
            </p>
          )}
        </div>
      </Link>

      {isAdmin && onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onDelete(trip);
          }}
          disabled={deleting}
          className="absolute right-1 top-1 rounded-full border border-white/20 bg-black/60 px-2.5 py-1 text-xs text-white opacity-0 backdrop-blur transition-opacity hover:bg-red-600 group-hover:opacity-100 disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
      )}
    </div>
  );
}
