"use client";

import { useCallback, useEffect, useState } from "react";
import { GALLERY_REFRESH_EVENT } from "@/lib/gallery-admin";
import { refreshGalleryHomeRandomized } from "@/lib/gallery-home-cache";

function waitForPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

export function useGalleryHomeInit() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const init = useCallback(async () => {
    setLoading(true);
    setError(null);
    // Yield so React can paint the loading state before sync cache work finishes.
    await waitForPaint();
    try {
      await refreshGalleryHomeRandomized();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load gallery");
    } finally {
      await waitForPaint();
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void init();
    const refresh = () => {
      void init();
    };
    window.addEventListener(GALLERY_REFRESH_EVENT, refresh);
    return () => window.removeEventListener(GALLERY_REFRESH_EVENT, refresh);
  }, [init]);

  return { loading, error, retry: init };
}
