"use client";

import { formatTagLabel } from "@/lib/photo-tags";
import { cn } from "@/lib/utils";

export type TripTagOption = {
  tag: string;
  count: number;
};

type TripTagFilterProps = {
  tags: TripTagOption[];
  value: string | null;
  onChange: (tag: string | null) => void;
  className?: string;
};

export function TripTagFilter({
  tags,
  value,
  onChange,
  className,
}: TripTagFilterProps) {
  if (tags.length === 0) return null;

  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      role="group"
      aria-label="Filter by tag"
    >
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          "rounded-full border px-3 py-1 text-[11px] font-medium tracking-wide shadow-sm transition",
          value === null
            ? "border-stone-900 bg-stone-900 text-white dark:border-amber-100 dark:bg-amber-100 dark:text-stone-950"
            : "border-stone-300/90 bg-white text-stone-700 hover:border-stone-400 hover:bg-stone-50 hover:text-stone-950 dark:border-white/20 dark:bg-zinc-950 dark:text-stone-200 dark:hover:border-white/35 dark:hover:bg-zinc-900 dark:hover:text-white",
        )}
      >
        All tags
      </button>
      {tags.map(({ tag, count }) => {
        const active = value?.toLowerCase() === tag.toLowerCase();
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onChange(active ? null : tag)}
            className={cn(
              "rounded-full border px-3 py-1 text-[11px] font-medium tracking-wide shadow-sm transition",
              active
                ? "border-stone-900 bg-stone-900 text-white dark:border-amber-100 dark:bg-amber-100 dark:text-stone-950"
                : "border-stone-300/90 bg-white text-stone-700 hover:border-stone-400 hover:bg-stone-50 hover:text-stone-950 dark:border-white/20 dark:bg-zinc-950 dark:text-stone-200 dark:hover:border-white/35 dark:hover:bg-zinc-900 dark:hover:text-white",
            )}
          >
            #{formatTagLabel(tag)}
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
