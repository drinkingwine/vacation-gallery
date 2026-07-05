"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { PhotoFilmstrip } from "@/components/gallery/photo-detail/PhotoFilmstrip";
import { PhotoInfoSidebar } from "@/components/gallery/photo-detail/PhotoInfoSidebar";
import { PhotoMediaCanvas } from "@/components/gallery/photo-detail/PhotoMediaCanvas";
import { galleryCopy } from "@/lib/gallery-copy";
import type { GalleryItem } from "@/lib/gallery";
import { cn } from "@/lib/utils";

function viewerToolClass(active = false) {
  return cn(
    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition",
    active
      ? "border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800 dark:border-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
      : "border-zinc-200 bg-white/80 text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-white dark:hover:bg-zinc-800",
  );
}

type PhotoDetailModalProps = {
  selectedItem: GalleryItem | null;
  items?: GalleryItem[];
  onSelect?: (id: string) => void;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  isAdmin?: boolean;
  onEdit?: (item: GalleryItem) => void;
  onMakeDefault?: (item: GalleryItem) => void;
  isCoverPhoto?: (item: GalleryItem) => boolean;
  onPhotoChanged?: () => void;
  onItemTagsChange?: (itemId: string, tags: string[]) => void;
};

export function PhotoDetailModal({
  selectedItem,
  items = [],
  onSelect,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  isAdmin = false,
  onEdit,
  onMakeDefault,
  isCoverPhoto,
  onPhotoChanged,
  onItemTagsChange,
}: PhotoDetailModalProps) {
  useEffect(() => {
    if (!selectedItem) return;

    const handlePopState = () => onClose();
    window.history.pushState({ modal: true }, "");
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [selectedItem, onClose]);

  if (!selectedItem) return null;

  const modalContent = (
    <AnimatePresence>
      {selectedItem ? (
        <PhotoDetailContent
          item={selectedItem}
          items={items}
          onSelect={onSelect}
          onClose={onClose}
          onPrev={onPrev}
          onNext={onNext}
          hasPrev={hasPrev}
          hasNext={hasNext}
          isAdmin={isAdmin}
          onEdit={onEdit}
          onMakeDefault={onMakeDefault}
          isCoverPhoto={isCoverPhoto}
          onPhotoChanged={onPhotoChanged}
          onItemTagsChange={onItemTagsChange}
        />
      ) : null}
    </AnimatePresence>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : null;
}

function PhotoDetailContent({
  item,
  items,
  onSelect,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  isAdmin = false,
  onEdit,
  onMakeDefault,
  isCoverPhoto,
  onPhotoChanged,
  onItemTagsChange,
}: {
  item: GalleryItem;
  items: GalleryItem[];
  onSelect?: (id: string) => void;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  isAdmin?: boolean;
  onEdit?: (item: GalleryItem) => void;
  onMakeDefault?: (item: GalleryItem) => void;
  isCoverPhoto?: (item: GalleryItem) => boolean;
  onPhotoChanged?: () => void;
  onItemTagsChange?: (itemId: string, tags: string[]) => void;
}) {
  const [viewMode, setViewMode] = useState<"fit" | "frame">("fit");
  const [showDetails, setShowDetails] = useState(false);
  const [direction, setDirection] = useState(0);
  const [isDraggingFilmstrip, setIsDraggingFilmstrip] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const filmstripRef = useRef<HTMLDivElement | null>(null);
  const thumbRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const dragPointerIdRef = useRef<number | null>(null);
  const dragStartXRef = useRef(0);
  const dragStartScrollLeftRef = useRef(0);
  const previousItemIdRef = useRef(item.id);

  useEffect(() => {
    if (previousItemIdRef.current === item.id) return;
    const prevIndex = items.findIndex((i) => i.id === previousItemIdRef.current);
    const currentIndex = items.findIndex((i) => i.id === item.id);
    let newDir = currentIndex > prevIndex ? 1 : -1;
    if (prevIndex === items.length - 1 && currentIndex === 0) newDir = 1;
    if (prevIndex === 0 && currentIndex === items.length - 1) newDir = -1;
    setDirection(newDir);
    previousItemIdRef.current = item.id;
  }, [item.id, items]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && hasPrev) onPrev();
      if (event.key === "ArrowRight" && hasNext) onNext();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hasNext, hasPrev, onClose, onNext, onPrev]);

  useEffect(() => {
    const node = filmstripRef.current;
    if (!node) return;

    const updateScrollState = () => {
      setCanScrollLeft(node.scrollLeft > 4);
      setCanScrollRight(node.scrollLeft + node.clientWidth < node.scrollWidth - 4);
    };

    updateScrollState();
    node.addEventListener("scroll", updateScrollState, { passive: true });
    return () => node.removeEventListener("scroll", updateScrollState);
  }, [items, item.id]);

  useEffect(() => {
    const thumb = thumbRefs.current[String(item.id)];
    thumb?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [item.id]);

  const showFilmstrip = items.length > 1 && typeof onSelect === "function";

  const handleFilmstripPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (!filmstripRef.current) return;
    setIsDraggingFilmstrip(true);
    dragPointerIdRef.current = event.pointerId;
    dragStartXRef.current = event.clientX;
    dragStartScrollLeftRef.current = filmstripRef.current.scrollLeft;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleFilmstripPointerMove = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (!isDraggingFilmstrip || !filmstripRef.current) return;
    if (dragPointerIdRef.current !== event.pointerId) return;
    const delta = event.clientX - dragStartXRef.current;
    filmstripRef.current.scrollLeft = dragStartScrollLeftRef.current - delta;
  };

  const endFilmstripDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current !== event.pointerId) return;
    setIsDraggingFilmstrip(false);
    dragPointerIdRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "photo-viewer-shell fixed inset-0 z-[100] flex h-dvh w-screen flex-col overflow-hidden text-foreground transition-colors duration-300",
      )}
    >
      <nav className="flex shrink-0 items-center justify-center gap-2 border-b border-rose-200/60 bg-white/75 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl dark:border-violet-700/50 dark:bg-indigo-950/75 sm:gap-3 sm:px-6">
        <button
          type="button"
          onClick={onClose}
          className={viewerToolClass()}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {galleryCopy.grid.modal.back}
        </button>
        <button
          type="button"
          onClick={() => setShowDetails((prev) => !prev)}
          className={viewerToolClass(showDetails)}
          aria-pressed={showDetails}
        >
          <Info className="h-3.5 w-3.5" />
          {showDetails
            ? galleryCopy.grid.modal.hideDetails
            : galleryCopy.grid.modal.details}
        </button>
        <button
          type="button"
          onClick={() =>
            setViewMode((prev) => (prev === "fit" ? "frame" : "fit"))
          }
          className={viewerToolClass(viewMode === "frame")}
          aria-pressed={viewMode === "frame"}
        >
          {viewMode === "fit"
            ? galleryCopy.grid.modal.viewFrame
            : galleryCopy.grid.modal.viewOriginal}
        </button>
      </nav>

      <div
        className={cn(
          "flex min-h-0 flex-1 overflow-hidden",
          showDetails ? "flex-col md:flex-row" : "flex-col",
        )}
      >
      <div className="group photo-viewer-canvas relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="relative flex min-h-0 flex-1 items-center justify-center">
          {hasPrev ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
              }}
              className="absolute left-2 top-1/2 z-40 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-sm backdrop-blur transition-all hover:bg-white dark:bg-black/40 dark:hover:bg-black/60 sm:left-4 sm:p-3 md:left-8"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          ) : null}

          <PhotoMediaCanvas
            item={item}
            direction={direction}
            viewMode={viewMode}
            onPrev={onPrev}
            onNext={onNext}
            hasPrev={hasPrev}
            hasNext={hasNext}
          />

          {hasNext ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              className="absolute right-2 top-1/2 z-40 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-sm backdrop-blur transition-all hover:bg-white dark:bg-black/40 dark:hover:bg-black/60 sm:right-4 sm:p-3 md:right-8"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          ) : null}
        </div>

        <PhotoFilmstrip
          show={showFilmstrip}
          items={items}
          currentItemId={item.id}
          canScrollLeft={canScrollLeft}
          canScrollRight={canScrollRight}
          isDraggingFilmstrip={isDraggingFilmstrip}
          filmstripRef={filmstripRef}
          thumbRefs={thumbRefs}
          onSelect={(id) => onSelect?.(id)}
          onPointerDown={handleFilmstripPointerDown}
          onPointerMove={handleFilmstripPointerMove}
          onPointerUp={endFilmstripDrag}
          onPointerCancel={endFilmstripDrag}
        />
      </div>

      <AnimatePresence>
        {showDetails ? (
          <motion.div
            key="photo-details"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2 }}
            className="flex min-h-0 shrink-0 flex-col md:h-full md:w-[min(420px,40vw)]"
          >
            <PhotoInfoSidebar
              item={item}
              isAdmin={isAdmin}
              onEdit={isAdmin && onEdit ? () => onEdit(item) : undefined}
              onMakeDefault={
                isAdmin && onMakeDefault ? () => onMakeDefault(item) : undefined
              }
              isDefaultPhoto={isCoverPhoto ? isCoverPhoto(item) : false}
              onTagsChange={(tags) => {
                onItemTagsChange?.(String(item.id), tags);
              }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
      </div>
    </motion.div>
  );
}
