"use client";

import { useCallback, useEffect } from "react";
import { Star } from "lucide-react";
import {
  DeleteIconButton,
  EditIconButton,
  MakeDefaultIconButton,
} from "@/components/gallery/PhotoOverlayIcons";
import type { Photo } from "@/lib/types";

type LightboxProps = {
  photos: Photo[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  isAdmin?: boolean;
  onDelete?: (photo: Photo) => void;
  onEdit?: (photo: Photo) => void;
  onMakeDefault?: (photo: Photo) => void;
  isCoverPhoto?: (photo: Photo) => boolean;
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
  onMakeDefault,
  isCoverPhoto,
  busy = false,
}: LightboxProps) {
  const photo = photos[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;
  const isDefault = photo && isCoverPhoto ? isCoverPhoto(photo) : false;

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
        className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 rounded-full border border-white/20 bg-white/10 p-2 text-white/70 backdrop-blur transition-colors hover:bg-white/20 hover:text-white sm:right-4 sm:top-4"
        aria-label="Close"
      >
        ✕
      </button>

      {(hasPrev || hasNext) && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-10 flex items-center justify-between px-3 sm:inset-y-0 sm:bottom-auto sm:px-4">
          {hasPrev ? (
            <button
              type="button"
              onClick={goPrev}
              className="pointer-events-auto rounded-full border border-white/10 bg-white/10 p-3 text-white/80 backdrop-blur transition hover:bg-white/15 hover:text-white sm:absolute sm:left-4 sm:top-1/2 sm:-translate-y-1/2"
              aria-label="Previous photo"
            >
              ←
            </button>
          ) : (
            <span className="sm:hidden" />
          )}
          {hasNext ? (
            <button
              type="button"
              onClick={goNext}
              className="pointer-events-auto rounded-full border border-white/10 bg-white/10 p-3 text-white/80 backdrop-blur transition hover:bg-white/15 hover:text-white sm:absolute sm:right-4 sm:top-1/2 sm:-translate-y-1/2"
              aria-label="Next photo"
            >
              →
            </button>
          ) : null}
        </div>
      )}

      <div className="absolute inset-0" onClick={onClose} aria-hidden />

      <div className="relative z-[1] flex max-h-[90dvh] w-full max-w-[min(100vw,90vw)] flex-col items-center px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-14 sm:max-w-[90vw] sm:px-0 sm:pb-0 sm:pt-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.downloadUrl}
          alt={photo.name}
          className="max-h-[70dvh] w-auto max-w-full object-contain sm:max-h-[80vh]"
        />

        <div className="mt-3 w-full text-center text-white/80 sm:mt-4">
          <p className="font-serif text-base text-white/90 sm:text-lg">{photo.name}</p>
          {photo.caption && (
            <p className="mt-1 text-sm text-white/70 sm:text-base">{photo.caption}</p>
          )}
          <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-white/50 sm:text-sm">
            <span>
              {formatBytes(photo.size)} · {currentIndex + 1} of {photos.length}
            </span>
            {isDefault ? (
              <Star
                className="h-3.5 w-3.5 fill-amber-300 text-amber-300"
                aria-label="Default photo"
              />
            ) : null}
          </p>
          {isAdmin && (onEdit || onDelete || onMakeDefault) && (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {onMakeDefault && !isDefault && (
                <MakeDefaultIconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    onMakeDefault(photo);
                  }}
                  busy={busy}
                />
              )}
              {onEdit && (
                <EditIconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(photo);
                  }}
                  disabled={busy}
                />
              )}
              {onDelete && (
                <DeleteIconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(photo);
                  }}
                  busy={busy}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
