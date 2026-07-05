"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Keyboard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PhotoFilmstrip } from "@/components/gallery/photo-detail/PhotoFilmstrip";
import { PhotoInfoSidebar } from "@/components/gallery/photo-detail/PhotoInfoSidebar";
import { PhotoMediaCanvas } from "@/components/gallery/photo-detail/PhotoMediaCanvas";
import { galleryCopy } from "@/lib/gallery-copy";
import type { GalleryItem } from "@/lib/gallery";

type PhotoDetailModalProps = {
  selectedItem: GalleryItem | null;
  items?: GalleryItem[];
  onSelect?: (id: string) => void;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
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
}: {
  item: GalleryItem;
  items: GalleryItem[];
  onSelect?: (id: string) => void;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  const [viewMode, setViewMode] = useState<"fit" | "frame">("fit");
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
      className="fixed inset-0 z-[100] flex h-screen w-screen overflow-hidden bg-background text-foreground transition-colors duration-300"
    >
      <div className="group relative flex h-full flex-grow flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-50 flex items-start justify-between p-4">
          <div className="pointer-events-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full bg-white/50 backdrop-blur-md hover:bg-white/80 dark:bg-black/50 dark:hover:bg-black/80"
              aria-label={galleryCopy.grid.modal.closeAria}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full bg-white/50 backdrop-blur-md hover:bg-white/80 dark:bg-black/50 dark:hover:bg-black/80"
                    aria-label={galleryCopy.grid.modal.keyboardShortcuts}
                  >
                    <Keyboard className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        ←/→
                      </span>
                      <span>{galleryCopy.grid.modal.shortcuts.prevNext}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        ESC
                      </span>
                      <span>{galleryCopy.grid.modal.shortcuts.close}</span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setViewMode((prev) => (prev === "fit" ? "frame" : "fit"))
              }
              className="rounded-full bg-white/50 backdrop-blur-md hover:bg-white/80 dark:bg-black/50 dark:hover:bg-black/80"
            >
              {viewMode === "fit"
                ? galleryCopy.grid.modal.viewFrame
                : galleryCopy.grid.modal.viewOriginal}
            </Button>
          </div>
        </div>

        <div className="relative flex h-full flex-grow items-center justify-center">
          {hasPrev ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
              }}
              className="absolute left-4 top-1/2 z-40 -translate-y-1/2 rounded-full bg-white/80 p-3 shadow-sm backdrop-blur transition-all hover:bg-white dark:bg-black/40 dark:hover:bg-black/60 md:left-8"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          ) : null}

          <PhotoMediaCanvas
            item={item}
            direction={direction}
            viewMode={viewMode}
          />

          {hasNext ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              className="absolute right-4 top-1/2 z-40 -translate-y-1/2 rounded-full bg-white/80 p-3 shadow-sm backdrop-blur transition-all hover:bg-white dark:bg-black/40 dark:hover:bg-black/60 md:right-8"
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

      <PhotoInfoSidebar item={item} />
    </motion.div>
  );
}
