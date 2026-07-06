import type { LucideIcon } from "lucide-react";
import { Home, Images, Landmark, Map, Users } from "lucide-react";

export type MainNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const mainNavItems: readonly MainNavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Gallery", href: "/gallery", icon: Images },
  { label: "People", href: "/people", icon: Users },
  { label: "Places", href: "/places", icon: Landmark },
  { label: "Map", href: "/map", icon: Map },
];
