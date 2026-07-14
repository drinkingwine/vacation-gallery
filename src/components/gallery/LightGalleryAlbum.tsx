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
  /** Videos use a dedicated watch page — keep lightGallery photo-only. */
  onVideoOpen?: (item: GalleryItem) => void;
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
  onVideoOpen,
  className,
  isAdmin = false,
  onEdit,
  onMakeDefault,
  isCoverPhoto,
  onItemTagsChange,
}: LightGalleryAlbumProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  // lightGallery only handles photos; videos route to a dedicated page.
  const photoItems = useMemo(
    () => items.filter((item) => item.type !== "video"),
    [items],
  );
  const elements = useMemo(
    () => toLightGalleryElements(photoItems),
    [photoItems],
  );
  const openIndex = useMemo(() => {
    const index = findItemIndex(photoItems, selectedId);
    return index >= 0 ? index : null;
  }, [photoItems, selectedId]);

  const selectedItem = useMemo(() => {
    const index = findItemIndex(photoItems, selectedId);
    return index >= 0 ? photoItems[index] : null;
  }, [photoItems, selectedId]);

  const photoItemsRef = useRef(photoItems);
  photoItemsRef.current = photoItems;
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  const handleSlideChange = useCallback(
    (index: number) => {
      const item = photoItemsRef.current[index];
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
    const item = photoItemsRef.current[index];
    if (!item) return;
    if (String(item.id) !== String(selectedIdRef.current)) {
      onSelectedIdChange?.(item.id);
    }
    setDetailsOpen(true);
  }, [onSelectedIdChange]);

  const handleThumbClick = useCallback(
    (item: GalleryItem) => {
      if (item.type === "video") {
        onVideoOpen?.(item);
        return;
      }
      if (isAdmin && onEdit) {
        onEdit(item);
        return;
      }
      onSelectedIdChange?.(item.id);
    },
    [isAdmin, onEdit, onSelectedIdChange, onVideoOpen],
  );

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
              aria-label={
                isVideo
                  ? `Play ${item.title}`
                  : isAdmin && onEdit
                    ? `Edit ${item.title}`
                    : item.title
              }
              onClick={() => handleThumbClick(item)}
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
