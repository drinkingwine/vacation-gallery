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
  onEdit?: (photo: Photo) => void;
  busy?: boolean;
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
  onEdit,
  busy = false,
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      role="dialog"
      aria-modal
      aria-label="Photo viewer"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full border border-white/20 bg-white/10 p-2 text-white/70 backdrop-blur transition-colors hover:bg-white/20 hover:text-white"
        aria-label="Close"
      >
        ✕
      </button>

      {hasPrev && (
        <button
          type="button"
          onClick={goPrev}
          className="absolute left-4 z-10 rounded-full border border-white/10 bg-white/5 p-3 text-white/60 backdrop-blur transition hover:bg-white/15 hover:text-white"
          aria-label="Previous photo"
        >
          ←
        </button>
      )}

      {hasNext && (
        <button
          type="button"
          onClick={goNext}
          className="absolute right-4 top-16 z-10 rounded-full border border-white/10 bg-white/5 p-3 text-white/60 backdrop-blur transition hover:bg-white/15 hover:text-white"
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
          <p className="font-serif text-lg text-white/90">{photo.name}</p>
          {photo.caption && (
            <p className="mt-1 text-base text-white/70">{photo.caption}</p>
          )}
          <p className="mt-1 text-sm text-white/50">
            {formatBytes(photo.size)} · {currentIndex + 1} of {photos.length}
          </p>
          {isAdmin && (onEdit || onDelete) && (
            <div className="mt-3 flex justify-center gap-2">
              {onEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(photo);
                  }}
                  disabled={busy}
                  className="rounded-full border border-white/30 px-4 py-1.5 text-sm text-white transition-colors hover:bg-white/10 disabled:opacity-50"
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(photo);
                  }}
                  disabled={busy}
                  className="rounded-full border border-red-400/60 px-4 py-1.5 text-sm text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                >
                  {busy ? "Working…" : "Delete"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
