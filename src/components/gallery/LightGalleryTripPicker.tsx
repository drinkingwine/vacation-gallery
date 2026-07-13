"use client";

import Link from "next/link";
import { formatMediaCountFromTrip, totalMediaCount } from "@/lib/media-count";
import { formatDateRange } from "@/lib/trip-meta";
import type { Trip } from "@/lib/types";
import { cn } from "@/lib/utils";

type LightGalleryTripPickerProps = {
  trips: Trip[];
  isAdmin?: boolean;
  onDelete?: (trip: Trip) => void;
  deletingName?: string | null;
  className?: string;
};

export function LightGalleryTripPicker({
  trips,
  isAdmin = false,
  onDelete,
  deletingName = null,
  className,
}: LightGalleryTripPickerProps) {
  if (trips.length === 0) return null;

  return (
    <div className={cn("vc-lg-album vc-lg-trip-picker", className)}>
      {trips.map((trip) => {
        const dates = formatDateRange(trip.startDate, trip.endDate);
        const meta = [dates, trip.location?.trim()].filter(Boolean).join(" · ");
        const count = totalMediaCount(trip);
        const href = `/trips/${encodeURIComponent(trip.name)}`;

        return (
          <figure key={trip.path} className="vc-lg-album-figure group relative">
            <Link href={href} className="vc-lg-album-item" aria-label={`Open ${trip.title}`}>
              {trip.coverUrl ? (
                <img
                  src={trip.coverUrl}
                  alt={trip.title}
                  loading="lazy"
                  className="vc-lg-album-media"
                />
              ) : (
                <div className="vc-lg-album-fallback">
                  <span>{trip.title.slice(0, 1)}</span>
                </div>
              )}
              <span className="vc-lg-album-count">{count}</span>
            </Link>

            <figcaption className="vc-lg-album-caption">
              <Link href={href} className="vc-lg-album-caption-title">
                {trip.title}
              </Link>
              {meta ? <p className="vc-lg-album-caption-meta">{meta}</p> : null}
              <p className="vc-lg-album-caption-meta">
                {formatMediaCountFromTrip(trip)}
              </p>
            </figcaption>

            {isAdmin && onDelete ? (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onDelete(trip);
                }}
                disabled={deletingName === trip.name}
                className="absolute right-2 top-2 z-10 rounded-full border border-white/25 bg-black/55 px-2.5 py-1 text-xs text-white opacity-0 backdrop-blur transition-opacity hover:bg-red-600 group-hover:opacity-100 disabled:opacity-50"
              >
                {deletingName === trip.name ? "Deleting…" : "Delete"}
              </button>
            ) : null}
          </figure>
        );
      })}
    </div>
  );
}
