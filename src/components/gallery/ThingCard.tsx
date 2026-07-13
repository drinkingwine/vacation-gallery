"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CoverImage,
  coverCardLabelClass,
  coverCountBadgeClass,
  coverFrameClass,
} from "@/components/gallery/CoverImage";
import { thingGalleryPath, type ThingSummary } from "@/lib/things-gallery";

type ThingCardProps = {
  thing: ThingSummary;
  priority?: boolean;
  index?: number;
};

export function ThingCard({
  thing,
  priority = false,
  index = 0,
}: ThingCardProps) {
  const cover = thing.coverUrl;
  const [coverLoaded, setCoverLoaded] = useState(false);

  useEffect(() => {
    setCoverLoaded(false);
  }, [cover]);

  return (
    <div
      className="gallery-card-enter group relative block"
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
    >
      <Link href={thingGalleryPath(thing.tag)} className="block">
        <div className={coverFrameClass(coverLoaded)}>
          {cover ? (
            <CoverImage
              src={cover}
              alt={thing.label}
              unoptimized
              priority={priority}
              sizes="(max-width: 768px) 50vw, 16vw"
              onCoverLoad={() => setCoverLoaded(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800">
              <span className="font-serif text-2xl text-zinc-400">
                {thing.label.slice(0, 1)}
              </span>
            </div>
          )}
          <div className={coverCountBadgeClass()}>{thing.photoCount}</div>
        </div>

        <div className="px-1">
          <h2 className={coverCardLabelClass()}>{thing.label}</h2>
        </div>
      </Link>
    </div>
  );
}
