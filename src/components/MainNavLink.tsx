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
};

export function MainNavLink({
  item,
  active = false,
  className,
  iconClassName,
  layout = "inline",
  variant = "plain",
  badgeTone = "default",
}: MainNavLinkProps) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "transition",
        variant === "badge"
          ? navBadgeClass(active, className, badgeTone)
          : layout === "stacked"
            ? "inline-flex flex-col items-center gap-0.5"
            : "inline-flex items-center gap-1.5",
        variant !== "badge" ? className : undefined,
      )}
    >
      <Icon
        className={cn(
          "shrink-0",
          layout === "stacked" ? "h-3.5 w-3.5" : "h-3.5 w-3.5 sm:h-4 sm:w-4",
          active && "opacity-100",
          iconClassName,
        )}
        aria-hidden
      />
      <span>{item.label}</span>
    </Link>
  );
}
