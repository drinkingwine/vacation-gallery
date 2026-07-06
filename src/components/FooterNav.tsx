"use client";

import { usePathname } from "next/navigation";
import { MainNavLink } from "@/components/MainNavLink";
import { mainNavItems } from "@/lib/nav-items";

export function FooterNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {mainNavItems.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        return (
          <MainNavLink
            key={item.href}
            item={item}
            active={active}
            variant="badge"
          />
        );
      })}
    </div>
  );
}
