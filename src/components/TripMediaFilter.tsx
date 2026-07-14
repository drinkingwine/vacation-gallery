"use client";

import { cn } from "@/lib/utils";

export type TripMediaFilterValue = "all" | "photo" | "video";

const MEDIA_FILTERS: Array<{ value: TripMediaFilterValue; label: string }> = [
  { value: "all", label: "All" },
  { value: "photo", label: "Photos" },
  { value: "video", label: "Videos" },
];

type TripMediaFilterProps = {
  value: TripMediaFilterValue;
  onChange: (value: TripMediaFilterValue) => void;
  photos: number;
  videos: number;
  total: number;
  className?: string;
};

export function TripMediaFilter({
  value,
  onChange,
  photos,
  videos,
  total,
  className,
}: TripMediaFilterProps) {
  return (
    <div
      className={cn(
        "inline-flex shrink-0 rounded-full border border-zinc-200 bg-zinc-50/80 p-1 dark:border-zinc-700 dark:bg-zinc-900/70",
        className,
      )}
      role="group"
      aria-label="Filter media type"
    >
      {MEDIA_FILTERS.map((tab) => {
        const count =
          tab.value === "all"
            ? total
            : tab.value === "photo"
              ? photos
              : videos;
        const active = value === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium tracking-wide transition",
              active
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white",
            )}
          >
            {tab.label}
            <span
              className={cn(
                "ml-1.5 tabular-nums",
                active ? "opacity-80" : "opacity-55",
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
