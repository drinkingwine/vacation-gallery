"use client";

import { useCallback, useEffect, useState } from "react";
import { GALLERY_REFRESH_EVENT } from "@/lib/gallery-admin";
import {
  loadGalleryHome,
  rerandomizeGalleryHomeCoversInBackground,
} from "@/lib/gallery-home-cache";

export function useGalleryHomeInit() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const init = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await loadGalleryHome();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load gallery");
    } finally {
      setLoading(false);
    }
    rerandomizeGalleryHomeCoversInBackground();
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
