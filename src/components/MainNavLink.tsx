import Link from "next/link";
import type { MainNavItem } from "@/lib/nav-items";
import { navBadgeClass, type NavBadgeTone } from "@/lib/nav-badge-styles";
import { cn } from "@/lib/utils";

type MainNavLinkProps = {
  item: MainNavItem;
  active?: boolean;
  className?: string;
  iconClassName?: string;
  layout?: "inline" | "stacked";
  variant?: "plain" | "badge";
  badgeTone?: NavBadgeTone;
  /** Visually hide the label (keeps it for screen readers). */
  labelHidden?: boolean;
};

export function MainNavLink({
  item,
  active = false,
  className,
  iconClassName,
  layout = "inline",
  variant = "plain",
  badgeTone = "default",
  labelHidden = false,
}: MainNavLinkProps) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-label={labelHidden ? item.label : undefined}
      className={cn(
        "transition",
        variant === "badge"
          ? navBadgeClass(
              active,
              cn(
                layout === "stacked" && "flex-col gap-0.5",
                className,
              ),
              badgeTone,
            )
          : layout === "stacked"
            ? "inline-flex flex-col items-center gap-0.5"
            : "inline-flex items-center gap-1.5",
        variant !== "badge" ? className : undefined,
      )}
    >
      <Icon
        className={cn(
          "shrink-0",
          layout === "stacked" ? "h-4 w-4" : "h-3.5 w-3.5 sm:h-4 sm:w-4",
          active && "opacity-100",
          iconClassName,
        )}
        aria-hidden
      />
      {labelHidden ? (
        <span className="sr-only">{item.label}</span>
      ) : (
        <span>{item.label}</span>
      )}
    </Link>
  );
}
