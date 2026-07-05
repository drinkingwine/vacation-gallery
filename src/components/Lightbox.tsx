"use client";

import { useCallback, useEffect } from "react";
import type { Photo } from "@/lib/types";

type LightboxProps = {
  photos: Photo[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  isAdmin?: boolean;
  onDelete?: (photo: Photo) => void;
  deleting?: boolean;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function Lightbox({
  photos,
  currentIndex,
  onClose,
  onNavigate,
  isAdmin = false,
  onDelete,
  deleting = false,
}: LightboxProps) {
  const photo = photos[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;

  const goPrev = useCallback(() => {
    if (hasPrev) onNavigate(currentIndex - 1);
  }, [currentIndex, hasPrev, onNavigate]);

  const goNext = useCallback(() => {
    if (hasNext) onNavigate(currentIndex + 1);
  }, [currentIndex, hasNext, onNavigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, goPrev, goNext]);

  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
      role="dialog"
      aria-modal
      aria-label="Photo viewer"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        aria-label="Close"
      >
        ✕
      </button>

      {hasPrev && (
        <button
          type="button"
          onClick={goPrev}
          className="absolute left-4 z-10 rounded-full p-3 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Previous photo"
        >
          ←
        </button>
      )}

      {hasNext && (
        <button
          type="button"
          onClick={goNext}
          className="absolute right-4 top-16 z-10 rounded-full p-3 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Next photo"
        >
          →
        </button>
      )}

      <div className="absolute inset-0" onClick={onClose} aria-hidden />

      <div className="relative z-[1] flex max-h-[90vh] max-w-[90vw] flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.downloadUrl}
          alt={photo.name}
          className="max-h-[80vh] max-w-[90vw] object-contain"
        />

        <div className="mt-4 text-center text-white/80">
          <p className="text-lg text-white/90">{photo.name}</p>
          <p className="mt-1 text-sm text-white/50">
            {formatBytes(photo.size)} · {currentIndex + 1} of {photos.length}
          </p>
          {isAdmin && onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(photo);
              }}
              disabled={deleting}
              className="mt-3 rounded-full border border-red-400/60 px-4 py-1.5 text-sm text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete photo"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
