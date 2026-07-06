import { cn } from "@/lib/utils";

export type NavBadgeTone = "default" | "hero";

const badgeBase =
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] backdrop-blur-sm transition-colors";

const hoverBg = "hover:bg-slate-900/[0.06] dark:hover:bg-slate-50/10";

export function navBadgeClass(
  active = false,
  className?: string,
  tone: NavBadgeTone = "default",
) {
  if (tone === "hero") {
    return cn(
      badgeBase,
      active
        ? "border-white/35 bg-white/15 text-white"
        : cn(
            "border-white/20 bg-transparent text-white/80",
            "hover:border-white/30 hover:bg-white/10 hover:text-white",
          ),
      className,
    );
  }

  return cn(
    badgeBase,
    active
      ? "border-slate-900/25 bg-slate-900/10 text-slate-900 dark:border-slate-50/30 dark:bg-slate-50/15 dark:text-slate-50"
      : cn(
          "border-slate-200/70 bg-transparent text-slate-900 dark:border-slate-700/70 dark:text-slate-50",
          hoverBg,
        ),
    className,
  );
}
