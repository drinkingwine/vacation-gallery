"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CoverImage,
  coverFrameClass,
  coverPlaceholderClass,
} from "@/components/gallery/CoverImage";
import { placeGalleryPath, type PlaceSummary } from "@/lib/places-gallery";
import { cn } from "@/lib/utils";

type PlaceCardProps = {
  place: PlaceSummary;
  priority?: boolean;
};

export function PlaceCard({ place, priority = false }: PlaceCardProps) {
  const cover = place.coverUrl;
  const [coverLoaded, setCoverLoaded] = useState(false);

  useEffect(() => {
    setCoverLoaded(false);
  }, [cover]);

  return (
    <div className="group relative mt-2 block">
      <Link href={placeGalleryPath(place.slug)} className="block">
        <div className={coverFrameClass(coverLoaded)}>
          {cover ? (
            <div className={coverPlaceholderClass(coverLoaded)}>
              <CoverImage
                src={cover}
                alt={place.title}
                fill
                unoptimized
                priority={priority}
                sizes="(max-width: 768px) 100vw, 20vw"
                className="object-cover transition duration-500 group-hover:scale-105"
                onCoverLoad={() => setCoverLoaded(true)}
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-white shadow-lg dark:border-zinc-600 dark:from-zinc-700 dark:to-zinc-800">
              <span className="text-3xl font-serif text-zinc-400 dark:text-zinc-300">
                {place.title.charAt(0)}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2 px-1">
          <span
            className={cn(
              "inline-flex rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-900",
              "dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-100",
            )}
          >
            {place.title}
          </span>
          {place.location ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {place.location}
            </p>
          ) : null}
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {place.mediaLabel}
          </p>
        </div>
      </Link>
    </div>
  );
}
