"use client";

import { galleryCopy } from "@/lib/gallery-copy";
import { cn } from "@/lib/utils";

export type GalleryGridMediaFilter = "all" | "photo" | "video";

const MEDIA_FILTERS = [
  { value: "all" as const, key: "all" as const },
  { value: "photo" as const, key: "photo" as const },
  { value: "video" as const, key: "video" as const },
];

type ToggleProps = {
  active: boolean;
  onChange: (next: boolean) => void;
  onLabel: string;
  offLabel: string;
};

function ToggleChip({ active, onChange, onLabel, offLabel }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!active)}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1 text-xs transition",
        active
          ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
          : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {active ? offLabel : onLabel}
    </button>
  );
}

export type GalleryGridControlsProps = {
  filter: GalleryGridMediaFilter;
  onFilterChange: (value: GalleryGridMediaFilter) => void;
  summaryLabel?: string;
  mediaCounts?: {
    all: number;
    photo: number;
    video: number;
  };
  showMediaFilters?: boolean;
  columnCount?: number;
  onColumnCountChange?: (value: number) => void;
  columnSliderMax?: number;
  displayColumnCount?: number;
  tagsVisible?: boolean;
  onTagsVisibleChange?: (value: boolean) => void;
  downloadsVisible?: boolean;
  onDownloadsVisibleChange?: (value: boolean) => void;
  timestampsVisible?: boolean;
  onTimestampsVisibleChange?: (value: boolean) => void;
  untaggedOnly?: boolean;
  onUntaggedOnlyChange?: (value: boolean) => void;
  showUntaggedFilter?: boolean;
  sticky?: boolean;
  className?: string;
};

export function GalleryGridControls({
  filter,
  onFilterChange,
  summaryLabel,
  mediaCounts,
  showMediaFilters = true,
  columnCount,
  onColumnCountChange,
  columnSliderMax,
  displayColumnCount,
  tagsVisible,
  onTagsVisibleChange,
  downloadsVisible,
  onDownloadsVisibleChange,
  timestampsVisible,
  onTimestampsVisibleChange,
  untaggedOnly,
  onUntaggedOnlyChange,
  showUntaggedFilter = false,
  sticky = false,
  className,
}: GalleryGridControlsProps) {
  const showColumns =
    typeof columnCount === "number" &&
    typeof onColumnCountChange === "function" &&
    typeof columnSliderMax === "number";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white/85 p-3 shadow-sm backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/85 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:p-4",
        sticky && "sticky top-[calc(5.5rem+env(safe-area-inset-top))] z-30",
        className,
      )}
    >
      {showMediaFilters ? (
        <div className="-mx-1 flex overflow-x-auto px-1 pb-1 sm:mx-0 sm:overflow-visible sm:pb-0">
          <div className="flex shrink-0 gap-1.5 rounded-full border border-zinc-200 bg-white px-1.5 py-1.5 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:gap-2 sm:px-2 sm:py-2">
            {MEDIA_FILTERS.map((tab) => {
              const count = mediaCounts?.[tab.value];
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => onFilterChange(tab.value)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] transition sm:px-4 sm:py-2 sm:text-xs sm:tracking-[0.3em]",
                    filter === tab.value
                      ? "bg-zinc-100 text-zinc-900 dark:bg-white/10 dark:text-white"
                      : "text-zinc-600/80 hover:text-zinc-900 dark:text-white/60 dark:hover:text-white",
                  )}
                >
                  {galleryCopy.filters[tab.key]}
                  {typeof count === "number" ? (
                    <span
                      className={cn(
                        "ml-1.5 tabular-nums normal-case tracking-normal",
                        filter === tab.value ? "opacity-80" : "opacity-60",
                      )}
                    >
                      {count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="flex w-full flex-wrap items-center gap-3 text-sm text-muted-foreground sm:w-auto sm:justify-end">
        {summaryLabel ? (
          <span className="text-xs sm:text-sm">{summaryLabel}</span>
        ) : null}

        {showColumns ? (
          <label className="flex min-w-40 flex-1 items-center gap-2 text-xs text-muted-foreground sm:min-w-0 sm:flex-none">
            <span className="shrink-0">{galleryCopy.grid.columns.label}</span>
            <input
              type="range"
              min={2}
              max={columnSliderMax}
              step={1}
              value={Math.min(columnCount, columnSliderMax)}
              onChange={(event) =>
                onColumnCountChange(Number(event.target.value))
              }
              className="h-1 min-w-0 flex-1 cursor-pointer accent-primary sm:w-32 sm:flex-none"
              aria-label={galleryCopy.grid.columns.aria}
            />
            <span className="shrink-0 tabular-nums">
              {galleryCopy.grid.columns.count(
                displayColumnCount ?? columnCount,
              )}
            </span>
          </label>
        ) : null}

        {typeof tagsVisible === "boolean" && onTagsVisibleChange ? (
          <ToggleChip
            active={tagsVisible}
            onChange={onTagsVisibleChange}
            onLabel={galleryCopy.grid.tags.on}
            offLabel={galleryCopy.grid.tags.off}
          />
        ) : null}

        {showUntaggedFilter &&
        typeof untaggedOnly === "boolean" &&
        onUntaggedOnlyChange ? (
          <ToggleChip
            active={untaggedOnly}
            onChange={onUntaggedOnlyChange}
            onLabel={galleryCopy.grid.untagged.only}
            offLabel={galleryCopy.grid.untagged.all}
          />
        ) : null}

        {typeof downloadsVisible === "boolean" && onDownloadsVisibleChange ? (
          <ToggleChip
            active={downloadsVisible}
            onChange={onDownloadsVisibleChange}
            onLabel={galleryCopy.grid.downloads.on}
            offLabel={galleryCopy.grid.downloads.off}
          />
        ) : null}

        {typeof timestampsVisible === "boolean" &&
        onTimestampsVisibleChange ? (
          <ToggleChip
            active={timestampsVisible}
            onChange={onTimestampsVisibleChange}
            onLabel={galleryCopy.grid.timestamps.on}
            offLabel={galleryCopy.grid.timestamps.off}
          />
        ) : null}
      </div>
    </div>
  );
}
