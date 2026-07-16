"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export type GalleryCollectionItem = {
  key: string;
  href: string;
  title: string;
  coverUrl: string | null;
  count: number;
  countLabel?: string;
  meta?: string[];
};

type LightGalleryCollectionPickerProps = {
  items: GalleryCollectionItem[];
  className?: string;
};

export function LightGalleryCollectionPicker({
  items,
  className,
}: LightGalleryCollectionPickerProps) {
  if (items.length === 0) return null;

  return (
    <div className={cn("vc-lg-album vc-lg-trip-picker", className)}>
      {items.map((item) => {
        const countText =
          item.countLabel ??
          `${item.count} ${item.count === 1 ? "photo" : "photos"}`;

        return (
          <figure key={item.key} className="vc-lg-album-figure group relative">
            <Link
              href={item.href}
              className="vc-lg-album-item"
              aria-label={`Open ${item.title}`}
            >
              {item.coverUrl ? (
                <img
                  src={item.coverUrl}
                  alt={item.title}
                  loading="lazy"
                  className="vc-lg-album-media"
                />
              ) : (
                <div className="vc-lg-album-fallback">
                  <span>{item.title.slice(0, 1)}</span>
                </div>
              )}
              <span className="vc-lg-album-count">{item.count}</span>
            </Link>

            <figcaption className="vc-lg-album-caption">
              <Link href={item.href} className="vc-lg-album-caption-title">
                {item.title}
              </Link>
              {item.meta?.filter(Boolean).map((line) => (
                <p key={line} className="vc-lg-album-caption-meta">
                  {line}
                </p>
              ))}
              <p className="vc-lg-album-caption-meta">{countText}</p>
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
