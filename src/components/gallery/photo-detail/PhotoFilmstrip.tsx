"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import type { GalleryItem } from "@/lib/gallery";

type PhotoFilmstripProps = {
  show: boolean;
  items: GalleryItem[];
  currentItemId: string | number;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  isDraggingFilmstrip: boolean;
  filmstripRef: React.MutableRefObject<HTMLDivElement | null>;
  thumbRefs: React.MutableRefObject<Record<string, HTMLButtonElement | null>>;
  onSelect: (id: string) => void;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (event: React.PointerEvent<HTMLDivElement>) => void;
};

export function PhotoFilmstrip({
  show,
  items,
  currentItemId,
  canScrollLeft,
  canScrollRight,
  isDraggingFilmstrip,
  filmstripRef,
  thumbRefs,
  onSelect,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: PhotoFilmstripProps) {
  if (!show) return null;

  return (
    <div className="relative h-24 px-6 md:px-8">
      {canScrollLeft ? (
        <div className="pointer-events-none absolute left-0 top-0 z-20 h-full w-10 bg-gradient-to-r from-orange-100 to-transparent dark:from-indigo-950" />
      ) : null}
      {canScrollRight ? (
        <div className="pointer-events-none absolute right-0 top-0 z-20 h-full w-10 bg-gradient-to-l from-cyan-100 to-transparent dark:from-teal-950" />
      ) : null}

      <div
        ref={filmstripRef}
        className={cn(
          "custom-scrollbar flex h-full items-center gap-3 overflow-x-auto pb-1",
          isDraggingFilmstrip ? "cursor-grabbing select-none" : "cursor-grab",
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        {items.map((thumb) => {
          const isActive = thumb.id === currentItemId;
          return (
            <button
              key={thumb.id}
              type="button"
              ref={(node) => {
                thumbRefs.current[String(thumb.id)] = node;
              }}
              onClick={() => onSelect(String(thumb.id))}
              className={cn(
                "h-14 w-14 shrink-0 overflow-hidden rounded-sm transition-opacity",
                isActive
                  ? "border-2 border-primary shadow-lg ring-2 ring-white/20 dark:border-white"
                  : "opacity-50 hover:opacity-100",
              )}
            >
              <Image
                src={thumb.src}
                alt={thumb.title}
                width={56}
                height={56}
                unoptimized
                className="h-full w-full object-cover"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
