"use client";

import { useMemo } from "react";
import { LightGalleryViewer } from "@/components/gallery/LightGalleryViewer";
import type { GalleryItem } from "@/lib/gallery";
import { toLightGalleryElements } from "@/lib/gallery";
import { cn } from "@/lib/utils";

type GalleryId = string | number;

type LightGalleryAlbumProps = {
  items: GalleryItem[];
  selectedId?: GalleryId | null;
  onSelectedIdChange?: (id: GalleryId | null) => void;
  className?: string;
};

function findItemIndex(items: GalleryItem[], id: GalleryId | null | undefined) {
  if (id === null || id === undefined) return -1;
  const needle = String(id);
  return items.findIndex((item) => String(item.id) === needle);
}

export function LightGalleryAlbum({
  items,
  selectedId = null,
  onSelectedIdChange,
  className,
}: LightGalleryAlbumProps) {
  const elements = useMemo(() => toLightGalleryElements(items), [items]);
  const openIndex = useMemo(() => {
    const index = findItemIndex(items, selectedId);
    return index >= 0 ? index : null;
  }, [items, selectedId]);

  if (items.length === 0) return null;

  return (
    <>
      <div className={cn("vc-lg-album", className)}>
        {items.map((item) => {
          const isVideo = item.type === "video";
          return (
            <button
              key={item.id}
              type="button"
              className="vc-lg-album-item"
              data-media-type={item.type}
              aria-label={item.title}
              onClick={() => onSelectedIdChange?.(item.id)}
            >
              {isVideo ? (
                <video
                  src={item.src}
                  muted
                  playsInline
                  preload="metadata"
                  className="vc-lg-album-media"
                />
              ) : (
                <img
                  src={item.src}
                  alt={item.title}
                  loading="lazy"
                  className="vc-lg-album-media"
                />
              )}
            </button>
          );
        })}
      </div>

      <LightGalleryViewer
        elements={elements}
        openIndex={openIndex}
        onClose={() => onSelectedIdChange?.(null)}
        onSlideChange={(index) => {
          const item = items[index];
          if (item) onSelectedIdChange?.(item.id);
        }}
      />
    </>
  );
}
