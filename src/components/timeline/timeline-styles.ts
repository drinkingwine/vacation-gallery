import { cn } from "@/lib/utils";

export const timelineSectionLabelClass =
  "text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400";

export const timelineSurfaceClass =
  "rounded-2xl border border-zinc-200/80 bg-white/60 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/60";

const timelineBadgeBaseClass =
  "inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black text-amber-50 shadow-[0_2px_12px_rgba(0,0,0,0.28)] ring-1 ring-white/10 backdrop-blur-sm";

export const timelineDateBadgeClass = cn(
  timelineBadgeBaseClass,
  "px-2.5 py-1 font-serif text-[10px] font-medium tracking-[0.08em]",
);

export const timelineYearBadgeClass = cn(
  timelineBadgeBaseClass,
  "px-4 py-1.5 font-serif text-sm font-semibold tabular-nums tracking-[0.12em]",
);
