"use client";

import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type FavoriteAlbumCardProps = {
  photoCount: number;
  coverUrl: string | null;
  coverUrls?: string[];
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

export function FavoriteAlbumCard({
  photoCount,
  coverUrl,
  coverUrls = [],
}: FavoriteAlbumCardProps) {
  const stackCovers =
    coverUrls.length > 0
      ? coverUrls.slice(0, 3)
      : coverUrl
        ? [coverUrl]
        : [];

  return (
    <div className="group relative mt-2 block">
      <Link href="/gallery/favorites" className="block">
        <div className="relative mb-4 aspect-video w-full">
          {stackCovers.length > 0 ? (
            stackTransforms.map((transform, index) => {
              const src = stackCovers[Math.min(index, stackCovers.length - 1)];
              if (!src) return null;

              return (
                <div
                  key={index}
                  className={cn(
                    "absolute inset-0 overflow-hidden rounded-xl border border-rose-200/80 bg-white shadow-lg transition-all duration-500 ease-out dark:border-rose-500/30 dark:bg-zinc-800",
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
                    src={src}
                    alt="Favorite photo"
                    fill
                    unoptimized
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                  {index === 0 ? (
                    <div className="absolute inset-0 bg-gradient-to-t from-rose-950/50 via-transparent to-transparent" />
                  ) : null}
                  {index > 0 ? (
                    <div className="absolute inset-0 bg-black/10 transition-opacity duration-300 group-hover:opacity-0 dark:bg-black/30" />
                  ) : null}
                </div>
              );
            })
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl border border-rose-200/80 bg-gradient-to-br from-rose-50 via-white to-amber-50 shadow-lg transition-shadow group-hover:shadow-xl dark:border-rose-500/30 dark:from-rose-950/40 dark:via-zinc-900 dark:to-violet-950/40">
              <Star className="h-10 w-10 text-rose-300 dark:text-rose-400/80" />
            </div>
          )}
          <div className="absolute bottom-3 right-3 z-10 rounded-full border border-orange-400/60 bg-orange-500 px-2.5 py-1 text-[10px] font-semibold tabular-nums text-white shadow-sm">
            {photoCount}
          </div>
        </div>

        <div className="px-2">
          <h2 className="truncate text-lg font-semibold text-zinc-800 transition-colors group-hover:text-rose-600 dark:text-zinc-200 dark:group-hover:text-rose-300">
            Favorites
          </h2>
        </div>
      </Link>
    </div>
  );
}
