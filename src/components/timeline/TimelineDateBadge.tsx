import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  timelineDateBadgeClass,
  timelineYearBadgeClass,
} from "@/components/timeline/timeline-styles";

type TimelineDateBadgeProps = {
  children: ReactNode;
  variant?: "year" | "date";
  className?: string;
};

export function TimelineDateBadge({
  children,
  variant = "date",
  className,
}: TimelineDateBadgeProps) {
  return (
    <span
      className={cn(
        variant === "year" ? timelineYearBadgeClass : timelineDateBadgeClass,
        className,
      )}
    >
      <span className="text-[8px] leading-none text-amber-300/70" aria-hidden>
        ✦
      </span>
      {children}
      <span className="text-[8px] leading-none text-amber-300/70" aria-hidden>
        ✦
      </span>
    </span>
  );
}
