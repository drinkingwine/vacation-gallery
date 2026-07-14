"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { PhotoInfoSidebar } from "@/components/gallery/photo-detail/PhotoInfoSidebar";
import { galleryCopy } from "@/lib/gallery-copy";
import type { GalleryItem } from "@/lib/gallery";

type PhotoDetailsModalProps = {
  item: GalleryItem | null;
  onClose: () => void;
  isAdmin?: boolean;
  onEdit?: (item: GalleryItem) => void;
  onMakeDefault?: (item: GalleryItem) => void;
  isDefaultPhoto?: boolean;
  onItemTagsChange?: (itemId: string, tags: string[]) => void;
};

export function PhotoDetailsModal({
  item,
  onClose,
  isAdmin = false,
  onEdit,
  onMakeDefault,
  isDefaultPhoto = false,
  onItemTagsChange,
}: PhotoDetailsModalProps) {
  useEffect(() => {
    if (!item) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [item, onClose]);

  if (!item || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[2000] flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={galleryCopy.grid.modal.details}
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#1a1612]/50 backdrop-blur-[3px]"
        aria-label={galleryCopy.grid.modal.closeAria}
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[min(88dvh,40rem)] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-stone-200/90 bg-[#f7f4ef] shadow-[0_24px_80px_rgb(26_22_18/0.35)] sm:rounded-2xl dark:border-stone-700 dark:bg-[#211e1b]">
        <div className="flex shrink-0 items-center justify-between border-b border-stone-200/80 px-4 py-3 dark:border-stone-700/80">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-stone-400">
            {galleryCopy.grid.modal.details}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-500 transition hover:bg-stone-200/70 hover:text-stone-900 dark:hover:bg-stone-800 dark:hover:text-stone-100"
            aria-label={galleryCopy.grid.modal.closeAria}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <PhotoInfoSidebar
            item={item}
            isAdmin={isAdmin}
            onEdit={onEdit ? () => onEdit(item) : undefined}
            onMakeDefault={
              onMakeDefault ? () => onMakeDefault(item) : undefined
            }
            isDefaultPhoto={isDefaultPhoto}
            onTagsChange={
              onItemTagsChange
                ? (tags) => onItemTagsChange(String(item.id), tags)
                : undefined
            }
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
