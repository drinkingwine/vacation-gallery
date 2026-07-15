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
        "inline-flex shrink-0 rounded-full border border-stone-300/90 bg-white p-1 shadow-sm",
        "dark:border-white/20 dark:bg-zinc-950 dark:shadow-[0_8px_24px_rgb(0_0_0/0.35)]",
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
                ? "bg-stone-900 text-white dark:bg-amber-100 dark:text-stone-950"
                : "text-stone-700 hover:bg-stone-100 hover:text-stone-950 dark:text-stone-200 dark:hover:bg-white/10 dark:hover:text-white",
            )}
          >
            {tab.label}
            <span
              className={cn(
                "ml-1.5 tabular-nums",
                active ? "opacity-80" : "opacity-60",
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
