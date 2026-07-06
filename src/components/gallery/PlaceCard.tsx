"use client";

import Image from "next/image";
import Link from "next/link";
import { placeGalleryPath, type PlaceSummary } from "@/lib/places-gallery";
import { cn } from "@/lib/utils";

type PlaceCardProps = {
  place: PlaceSummary;
};

export function PlaceCard({ place }: PlaceCardProps) {
  const cover = place.coverUrl;

  return (
    <div className="group relative mt-2 block">
      <Link href={placeGalleryPath(place.slug)} className="block">
        <div className="relative mb-4 aspect-video w-full">
          {cover ? (
            <div className="absolute inset-0 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg transition-all duration-500 ease-out group-hover:-translate-y-1 group-hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-800">
              <Image
                src={cover}
                alt={place.title}
                fill
                unoptimized
                sizes="(max-width: 768px) 100vw, 20vw"
                className="object-cover transition duration-500 group-hover:scale-105"
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-white shadow-lg dark:border-zinc-700 dark:from-zinc-800 dark:to-zinc-900">
              <span className="text-3xl font-serif text-zinc-400 dark:text-zinc-500">
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
