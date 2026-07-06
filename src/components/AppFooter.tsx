"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/Footer";
import { useFooterConfigState } from "@/components/footer-config";

export function AppFooter() {
  const pathname = usePathname();
  const { stats } = useFooterConfigState();

  if (pathname === "/login") return null;

  return <Footer stats={stats} />;
}
