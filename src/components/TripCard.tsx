"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CoverImage,
  coverCardLabelClass,
  coverCardMetaClass,
  coverCountBadgeClass,
  coverFrameClass,
} from "@/components/gallery/CoverImage";
import { formatDateRange } from "@/lib/trip-meta";
import { totalMediaCount } from "@/lib/media-count";
import type { Trip } from "@/lib/types";

type TripCardProps = {
  trip: Trip;
  isAdmin?: boolean;
  onDelete?: (trip: Trip) => void;
  deleting?: boolean;
  priority?: boolean;
  index?: number;
};

export function TripCard({
  trip,
  isAdmin = false,
  onDelete,
  deleting = false,
  priority = false,
  index = 0,
}: TripCardProps) {
  const dates = formatDateRange(trip.startDate, trip.endDate);
  const cover = trip.coverUrl;
  const [coverLoaded, setCoverLoaded] = useState(false);

  useEffect(() => {
    setCoverLoaded(false);
  }, [cover]);

  return (
    <div
      className="gallery-card-enter group relative block"
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
    >
      <Link
        href={`/trips/${encodeURIComponent(trip.name)}`}
        className="block"
      >
        <div className={coverFrameClass(coverLoaded)}>
          {cover ? (
            <CoverImage
              src={cover}
              alt={trip.title}
              unoptimized
              priority={priority}
              sizes="(max-width: 768px) 50vw, 16vw"
              onCoverLoad={() => setCoverLoaded(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800">
              <span className="font-serif text-2xl text-zinc-400">
                {trip.title.slice(0, 1)}
              </span>
            </div>
          )}
          <div className={coverCountBadgeClass()}>
            {totalMediaCount(trip)}
          </div>
        </div>

        <div className="px-1">
          <h2 className={coverCardLabelClass()}>{trip.title}</h2>
          {dates ? <p className={coverCardMetaClass()}>{dates}</p> : null}
          {trip.location ? (
            <p className={coverCardMetaClass()}>{trip.location}</p>
          ) : null}
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
          className="absolute right-2 top-2 rounded-full border border-white/25 bg-black/55 px-2.5 py-1 text-xs text-white opacity-0 backdrop-blur transition-opacity hover:bg-red-600 group-hover:opacity-100 disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
      )}
    </div>
  );
}
