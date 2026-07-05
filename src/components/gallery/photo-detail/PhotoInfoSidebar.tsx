"use client";

import { Calendar, Download, MapPin, Pencil, Share2 } from "lucide-react";
import { galleryCopy } from "@/lib/gallery-copy";
import type { GalleryItem } from "@/lib/gallery";

type PhotoInfoSidebarProps = {
  item: GalleryItem;
  isAdmin?: boolean;
  onEdit?: () => void;
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
}: PhotoInfoSidebarProps) {
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

  return (
    <aside className="custom-scrollbar flex h-full w-[420px] shrink-0 flex-col overflow-y-auto border-l border-gray-100 bg-white dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="space-y-8 p-6">
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
            <a
              href={item.src}
              download
              className="flex h-8 w-8 items-center justify-center text-gray-500 transition-colors hover:text-primary dark:hover:text-white"
              title={galleryCopy.grid.modal.download}
            >
              <Download className="h-5 w-5" />
            </a>
          </div>
        </section>

        {item.locationName ? (
          <section>
            <div className="flex h-40 w-full items-center justify-center rounded-xl border border-zinc-100 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/70">
              <MapPin className="h-10 w-10 opacity-20" />
            </div>
            <div className="mt-2 flex items-center space-x-2 text-[11px] text-gray-500 dark:text-gray-400">
              <MapPin className="h-3.5 w-3.5" />
              <span>{item.locationName}</span>
            </div>
          </section>
        ) : null}

        <section className="space-y-3">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
            Details
          </h3>
          <div className="space-y-2.5">
            {item.tripName ? (
              <Row label={galleryCopy.grid.modal.trip} value={item.tripName} />
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

        {(item.tags ?? []).length > 0 ? (
          <section className="space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
              Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {(item.tags ?? []).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-zinc-200 px-2.5 py-1 text-[11px] text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </section>
        ) : null}

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
    <div className="flex items-center justify-between text-[12px]">
      <div className="flex items-center space-x-2 text-gray-400">
        {label === galleryCopy.grid.modal.captured ? (
          <Calendar className="h-3.5 w-3.5" />
        ) : null}
        <span>{label}</span>
      </div>
      <span className="font-semibold text-gray-900 dark:text-gray-100">
        {value}
      </span>
    </div>
  );
}
