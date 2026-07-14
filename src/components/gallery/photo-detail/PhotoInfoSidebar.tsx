"use client";

import { useEffect, useState } from "react";
import { Download, Pencil, Share2, Star } from "lucide-react";
import { DefaultPhotoBadge, MakeDefaultIconButton } from "@/components/gallery/PhotoOverlayIcons";
import { PhotoDetailsSection } from "@/components/gallery/photo-detail/PhotoDetailsSection";
import { LocationPreviewMap } from "@/components/map/LocationPreviewMap";
import { downloadGalleryItem } from "@/lib/gallery-download";
import { galleryCopy } from "@/lib/gallery-copy";
import { googleMapsPlaceUrl } from "@/lib/map";
import type { GalleryItem } from "@/lib/gallery";
import {
  FAVORITE_TAG,
  formatTagLabel,
  hasFavoriteTag,
} from "@/lib/photo-tags";
import { isFavoritesTrip } from "@/lib/favorites-trip";
import { cn } from "@/lib/utils";

type PhotoInfoSidebarProps = {
  item: GalleryItem;
  isAdmin?: boolean;
  onEdit?: () => void;
  onMakeDefault?: () => void;
  isDefaultPhoto?: boolean;
  onTagsChange?: (tags: string[]) => void;
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

  const isFavorite =
    hasFavoriteTag(tags) || (item.tripName ? isFavoritesTrip(item.tripName) : false);

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
      await downloadGalleryItem(item);
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
      const res = await fetch("/api/photos/favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trip: item.tripName,
          path: item.path,
          favorite: !isFavorite,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to update favorite");
      }

      const nextTags = isFavorite
        ? tags.filter((tag) => tag.toLowerCase() !== FAVORITE_TAG)
        : [...tags, FAVORITE_TAG];
      setTags(nextTags);
      onTagsChange?.(nextTags);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update favorite");
    } finally {
      setSavingFavorite(false);
    }
  };

  return (
    <aside className="custom-scrollbar flex h-full w-full flex-col overflow-y-auto bg-transparent">
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

        <PhotoDetailsSection
          tripName={item.tripName}
          locationName={item.locationName}
          latitude={item.latitude}
          longitude={item.longitude}
          width={item.width}
          height={item.height}
          size={item.size}
          dateShot={item.dateShot}
        />

        {typeof item.latitude === "number" &&
        typeof item.longitude === "number" &&
        Number.isFinite(item.latitude) &&
        Number.isFinite(item.longitude) ? (
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
                {galleryCopy.grid.modal.location}
              </h3>
              <a
                href={googleMapsPlaceUrl(item.latitude, item.longitude)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 underline decoration-zinc-300 underline-offset-2 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:decoration-zinc-600 dark:hover:text-zinc-100"
              >
                Open map
              </a>
            </div>
            <LocationPreviewMap
              latitude={item.latitude}
              longitude={item.longitude}
              label={item.locationName}
              heightClassName="h-72"
              className="rounded-xl"
            />
          </section>
        ) : null}

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
                <MakeDefaultIconButton
                  variant="toolbar"
                  onClick={onMakeDefault}
                />
              ) : null}
              {isDefaultPhoto ? (
                <DefaultPhotoBadge variant="toolbar" />
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
