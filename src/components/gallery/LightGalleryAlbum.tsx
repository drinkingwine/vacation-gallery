"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { LightGalleryViewer } from "@/components/gallery/LightGalleryViewer";
import { PhotoDetailsModal } from "@/components/gallery/PhotoDetailsModal";
import type { GalleryItem } from "@/lib/gallery";
import { toLightGalleryElements } from "@/lib/gallery";
import { cn } from "@/lib/utils";

type GalleryId = string | number;

type LightGalleryAlbumProps = {
  items: GalleryItem[];
  selectedId?: GalleryId | null;
  onSelectedIdChange?: (id: GalleryId | null) => void;
  className?: string;
  isAdmin?: boolean;
  onEdit?: (item: GalleryItem) => void;
  onMakeDefault?: (item: GalleryItem) => void;
  isCoverPhoto?: (item: GalleryItem) => boolean;
  onItemTagsChange?: (itemId: string, tags: string[]) => void;
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
  isAdmin = false,
  onEdit,
  onMakeDefault,
  isCoverPhoto,
  onItemTagsChange,
}: LightGalleryAlbumProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const elements = useMemo(() => toLightGalleryElements(items), [items]);
  const openIndex = useMemo(() => {
    const index = findItemIndex(items, selectedId);
    return index >= 0 ? index : null;
  }, [items, selectedId]);

  const selectedItem = useMemo(() => {
    const index = findItemIndex(items, selectedId);
    return index >= 0 ? items[index] : null;
  }, [items, selectedId]);

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  const handleSlideChange = useCallback(
    (index: number) => {
      const item = itemsRef.current[index];
      if (!item) return;
      if (String(item.id) === String(selectedIdRef.current)) return;
      setDetailsOpen(false);
      onSelectedIdChange?.(item.id);
    },
    [onSelectedIdChange],
  );

  const handleClose = useCallback(() => {
    setDetailsOpen(false);
    onSelectedIdChange?.(null);
  }, [onSelectedIdChange]);

  const handleMediaClick = useCallback((index: number) => {
    const item = itemsRef.current[index];
    if (!item) return;
    if (String(item.id) !== String(selectedIdRef.current)) {
      onSelectedIdChange?.(item.id);
    }
    setDetailsOpen(true);
  }, [onSelectedIdChange]);

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
        onClose={handleClose}
        onSlideChange={handleSlideChange}
        onSlideMediaClick={handleMediaClick}
      />

      <PhotoDetailsModal
        item={detailsOpen ? selectedItem : null}
        onClose={() => setDetailsOpen(false)}
        isAdmin={isAdmin}
        onEdit={onEdit}
        onMakeDefault={onMakeDefault}
        isDefaultPhoto={
          selectedItem && isCoverPhoto
            ? isCoverPhoto(selectedItem)
            : false
        }
        onItemTagsChange={onItemTagsChange}
      />
    </>
  );
}
