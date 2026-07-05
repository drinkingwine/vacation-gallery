"use client";

import { useEffect, useState } from "react";
import { getBreakpointLabel } from "@/lib/responsive";

export function FooterPageSize() {
  const [breakpoint, setBreakpoint] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      setBreakpoint(getBreakpointLabel(window.innerWidth));
    };

    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  if (!breakpoint) return null;

  return (
    <span className="tabular-nums text-muted-foreground">{breakpoint}</span>
  );
}
