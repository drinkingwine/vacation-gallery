import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  Home,
  History,
  Images,
  Landmark,
  Map,
  Package,
  Shapes,
  Users,
} from "lucide-react";

export type MainNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const mainNavItems: readonly MainNavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Vacations", href: "/gallery", icon: Images },
  { label: "People", href: "/people", icon: Users },
  { label: "Places", href: "/places", icon: Landmark },
  { label: "Things", href: "/things", icon: Shapes },
  { label: "Stuff", href: "/stuff", icon: Package },
  { label: "Events", href: "/events", icon: Calendar },
  { label: "Timeline", href: "/timeline", icon: History },
  { label: "Map", href: "/map", icon: Map },
];
