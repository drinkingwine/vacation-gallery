"use client";

import { useEffect, useState } from "react";
import { Calendar, Download, MapPin, Pencil, Share2, Star } from "lucide-react";
import { galleryCopy } from "@/lib/gallery-copy";
import type { GalleryItem } from "@/lib/gallery";
import {
  FAVORITE_TAG,
  formatTagLabel,
  hasFavoriteTag,
} from "@/lib/photo-tags";
import { cn } from "@/lib/utils";

type PhotoInfoSidebarProps = {
  item: GalleryItem;
  isAdmin?: boolean;
  onEdit?: () => void;
  onMakeDefault?: () => void;
  isDefaultPhoto?: boolean;
  onTagsChange?: (tags: string[]) => void;
};

const formatFileSize = (bytes?: number | null) => {
  if (typeof bytes !== "number") return null;
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const formatDate = (date?: string | null) => {
  if (!date) return null;
  return new Date(date).toLocaleString(undefined, { hour12: false });
};

export function PhotoInfoSidebar({
  item,
  isAdmin = false,
  onEdit,
  onMakeDefault,
  isDefaultPhoto = false,
  onTagsChange,
}: PhotoInfoSidebarProps) {
  const [tags, setTags] = useState(item.tags ?? []);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setTags(item.tags ?? []);
  }, [item.id, item.tags]);

  const isFavorite = hasFavoriteTag(tags);
  const resolution =
    item.width && item.height ? `${item.width} x ${item.height}` : "-";

  const handleShare = async () => {
    if (typeof window === "undefined") return;
    const shareUrl = new URL(window.location.href);
    shareUrl.searchParams.set("media", String(item.id));
    try {
      if (navigator.share) {
        await navigator.share({
          title: item.title,
          url: shareUrl.toString(),
        });
        return;
      }
      await navigator.clipboard.writeText(shareUrl.toString());
    } catch {
      // user cancelled or share failed
    }
  };

  const handleDownload = async () => {
    if (downloading) return;

    setDownloading(true);
    try {
      const res = await fetch(
        `/api/photos/download?path=${encodeURIComponent(item.path)}`,
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string" ? data.error : "Download failed",
        );
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = item.filename || "photo.jpg";
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  const handleFavoriteToggle = async () => {
    if (!isAdmin || !item.tripName || savingFavorite) return;

    setSavingFavorite(true);
    try {
      const res = await fetch("/api/photos/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trip: item.tripName,
          path: item.path,
          sha: item.sha,
          ...(isFavorite
            ? { removeTag: FAVORITE_TAG }
            : { addTag: FAVORITE_TAG }),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to update favorite tag");
      }

      const nextTags = isFavorite
        ? tags.filter((tag) => tag.toLowerCase() !== FAVORITE_TAG)
        : [...tags, FAVORITE_TAG];
      setTags(nextTags);
      onTagsChange?.(nextTags);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update favorite tag");
    } finally {
      setSavingFavorite(false);
    }
  };

  return (
    <aside className="custom-scrollbar photo-viewer-sidebar flex h-full max-h-[42dvh] w-full flex-col overflow-y-auto border-t border-rose-200/70 md:max-h-none md:border-l md:border-t-0 dark:border-violet-800/70">
      <div className="space-y-6 p-4 sm:space-y-8 sm:p-6">
        <section className="flex items-start justify-between">
          <h2 className="break-words pr-4 text-lg font-bold leading-tight tracking-tight text-primary dark:text-white">
            {item.title || galleryCopy.grid.modal.untitled}
          </h2>
          <div className="mt-1 flex shrink-0 items-center space-x-2">
            {isAdmin && onEdit ? (
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center text-gray-500 transition-colors hover:text-indigo-500 dark:hover:text-indigo-300"
                title="Edit photo"
                onClick={onEdit}
              >
                <Pencil className="h-5 w-5" />
              </button>
            ) : null}
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center text-gray-500 transition-colors hover:text-indigo-500 dark:hover:text-indigo-300"
              title={galleryCopy.grid.modal.share}
              onClick={() => void handleShare()}
            >
              <Share2 className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center text-gray-500 transition-colors hover:text-primary disabled:opacity-50 dark:hover:text-white"
              title={galleryCopy.grid.modal.download}
              disabled={downloading}
              onClick={() => void handleDownload()}
            >
              <Download className="h-5 w-5" />
            </button>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
            Details
          </h3>
          <div className="space-y-2.5">
            {item.tripName ? (
              <Row label={galleryCopy.grid.modal.trip} value={item.tripName} />
            ) : null}
            {item.locationName ? (
              <Row
                label={galleryCopy.grid.modal.location}
                value={
                  item.latitude != null && item.longitude != null ? (
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${item.latitude}&mlon=${item.longitude}#map=15/${item.latitude}/${item.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-right underline decoration-zinc-300 underline-offset-2 transition-colors hover:text-indigo-600 dark:decoration-zinc-600 dark:hover:text-indigo-300"
                    >
                      {item.locationName}
                    </a>
                  ) : (
                    item.locationName
                  )
                }
              />
            ) : null}
            <Row label="Resolution" value={resolution} />
            <Row
              label={galleryCopy.grid.modal.size}
              value={formatFileSize(item.size) ?? "-"}
            />
            <Row
              label={galleryCopy.grid.modal.captured}
              value={formatDate(item.dateShot) ?? "-"}
            />
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
            Tags
          </h3>
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const isFavoriteTag = tag.toLowerCase() === FAVORITE_TAG;
                return (
                  <span
                    key={tag}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px]",
                      isFavoriteTag
                        ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200"
                        : "border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300",
                    )}
                  >
                    #{formatTagLabel(tag)}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">No tags yet</p>
          )}
          {isAdmin ? (
            <div className="flex flex-col items-start gap-2">
              {onMakeDefault && !isDefaultPhoto ? (
                <button
                  type="button"
                  className="rounded-full border border-amber-400/40 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-600 transition-colors hover:bg-amber-500/10 dark:text-amber-300"
                  onClick={onMakeDefault}
                >
                  Make default
                </button>
              ) : null}
              {isDefaultPhoto ? (
                <span className="rounded-full border border-zinc-200 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                  Default
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => void handleFavoriteToggle()}
                disabled={savingFavorite}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors disabled:opacity-50",
                  isFavorite
                    ? "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20"
                    : "border-amber-400/40 text-amber-600 hover:bg-amber-500/10 dark:text-amber-300",
                )}
              >
                <Star
                  className={cn("h-3.5 w-3.5", isFavorite && "fill-current")}
                />
                {savingFavorite
                  ? "Saving…"
                  : isFavorite
                    ? galleryCopy.grid.modal.removeFavoriteTag
                    : galleryCopy.grid.modal.addFavoriteTag}
              </button>
            </div>
          ) : null}
        </section>

        {item.description ? (
          <section className="space-y-2">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
              Caption
            </h3>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              {item.description}
            </p>
          </section>
        ) : null}
      </div>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 text-[12px]">
      <div className="flex items-center space-x-2 text-gray-400">
        {label === galleryCopy.grid.modal.captured ? (
          <Calendar className="h-3.5 w-3.5" />
        ) : null}
        {label === galleryCopy.grid.modal.location ? (
          <MapPin className="h-3.5 w-3.5" />
        ) : null}
        <span>{label}</span>
      </div>
      <span className="max-w-[55%] text-right font-semibold text-gray-900 dark:text-gray-100">
        {value}
      </span>
    </div>
  );
}
