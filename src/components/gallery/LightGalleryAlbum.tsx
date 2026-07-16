"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useConfirm } from "@/components/ConfirmProvider";
import { LightGalleryViewer } from "@/components/gallery/LightGalleryViewer";
import {
  DeleteIconButton,
  PhotoTagOverlay,
} from "@/components/gallery/PhotoOverlayIcons";
import { PhotoDetailsModal } from "@/components/gallery/PhotoDetailsModal";
import type { GalleryItem } from "@/lib/gallery";
import { getItemDisplayTags, toLightGalleryElements } from "@/lib/gallery";
import { hasPhotoTag } from "@/lib/photo-tags";
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
  onItemRemoved?: (itemId: string) => void;
  onPhotoChanged?: () => void;
  /** When set, clicking an image toggles this tag instead of opening edit. */
  taggingMode?: boolean;
  activeTag?: string | null;
  onToggleTag?: (item: GalleryItem) => void;
  taggingBusyId?: string | null;
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
  onItemRemoved,
  onPhotoChanged,
  taggingMode = false,
  activeTag = null,
  onToggleTag,
  taggingBusyId = null,
}: LightGalleryAlbumProps) {
  const confirm = useConfirm();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

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
      if (taggingMode && onToggleTag) {
        onToggleTag(item);
        return;
      }
      if (isAdmin && onEdit) {
        onEdit(item);
        return;
      }
      onSelectedIdChange?.(item.id);
    },
    [isAdmin, onEdit, onSelectedIdChange, onToggleTag, onVideoOpen, taggingMode],
  );

  const handleDeleteItem = useCallback(
    async (item: GalleryItem) => {
      if (busyItemId) return;

      const confirmed = await confirm({
        title: "Are you sure?",
        message: `Delete "${item.filename}"? This cannot be undone.`,
        destructive: true,
      });
      if (!confirmed) return;

      setBusyItemId(String(item.id));
      try {
        const res = await fetch("/api/photos/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: item.path }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Delete failed");

        if (String(selectedId) === String(item.id)) {
          setDetailsOpen(false);
          onSelectedIdChange?.(null);
        }
        onItemRemoved?.(String(item.id));
        onPhotoChanged?.();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Delete failed");
      } finally {
        setBusyItemId(null);
      }
    },
    [
      busyItemId,
      confirm,
      onItemRemoved,
      onPhotoChanged,
      onSelectedIdChange,
      selectedId,
    ],
  );

  if (items.length === 0) return null;

  return (
    <>
      <div className={cn("vc-lg-album", className)}>
        {items.map((item) => {
          const isVideo = item.type === "video";
          const isBusy =
            busyItemId === String(item.id) ||
            taggingBusyId === String(item.id);
          const displayTags = getItemDisplayTags(item, 6);
          const hasActiveTag =
            Boolean(activeTag) && hasPhotoTag(item.tags ?? [], activeTag!);

          return (
            <figure
              key={item.id}
              className={cn(
                "vc-lg-album-figure group relative",
                taggingMode &&
                  hasActiveTag &&
                  "ring-2 ring-amber-400/80 ring-offset-2 ring-offset-transparent",
              )}
            >
              <button
                type="button"
                className="vc-lg-album-item"
                data-media-type={item.type}
                disabled={isBusy && taggingMode}
                aria-label={
                  isVideo
                    ? `Play ${item.title}`
                    : taggingMode && activeTag
                      ? `${hasActiveTag ? "Remove" : "Add"} #${activeTag} on ${item.title}`
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
                {taggingMode && displayTags.length > 0 ? (
                  <PhotoTagOverlay tags={displayTags} />
                ) : null}
              </button>

              {isAdmin ? (
                <div className="absolute right-2 top-2 z-20">
                  <DeleteIconButton
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void handleDeleteItem(item);
                    }}
                    busy={busyItemId === String(item.id)}
                    disabled={isBusy}
                  />
                </div>
              ) : null}
            </figure>
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
