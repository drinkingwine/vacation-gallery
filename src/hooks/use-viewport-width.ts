"use client";

import { useEffect, useState } from "react";

export function useViewportWidth() {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  return width;
}

export function useIsMobile(breakpoint = 768) {
  const width = useViewportWidth();
  return width > 0 && width < breakpoint;
}
