"use client";

import { useEffect, useState } from "react";

function readViewportWidth() {
  return typeof window !== "undefined" ? window.innerWidth : 0;
}

export function useViewportWidth() {
  const [width, setWidth] = useState(readViewportWidth);

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
