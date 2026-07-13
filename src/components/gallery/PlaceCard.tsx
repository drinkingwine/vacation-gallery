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
import { placeGalleryPath, type PlaceSummary } from "@/lib/places-gallery";

type PlaceCardProps = {
  place: PlaceSummary;
  priority?: boolean;
  index?: number;
};

export function PlaceCard({
  place,
  priority = false,
  index = 0,
}: PlaceCardProps) {
  const cover = place.coverUrl;
  const [coverLoaded, setCoverLoaded] = useState(false);

  useEffect(() => {
    setCoverLoaded(false);
  }, [cover]);

  return (
    <div
      className="gallery-card-enter group relative block"
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
    >
      <Link href={placeGalleryPath(place.slug)} className="block">
        <div className={coverFrameClass(coverLoaded)}>
          {cover ? (
            <CoverImage
              src={cover}
              alt={place.title}
              unoptimized
              priority={priority}
              sizes="(max-width: 768px) 50vw, 16vw"
              onCoverLoad={() => setCoverLoaded(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800">
              <span className="font-serif text-2xl text-zinc-400">
                {place.title.slice(0, 1)}
              </span>
            </div>
          )}
          <div className={coverCountBadgeClass()}>{place.photoCount}</div>
        </div>

        <div className="px-1">
          <h2 className={coverCardLabelClass()}>{place.title}</h2>
          {place.location ? (
            <p className={coverCardMetaClass()}>{place.location}</p>
          ) : null}
        </div>
      </Link>
    </div>
  );
}
