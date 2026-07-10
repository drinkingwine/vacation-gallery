"use client";

import { useCallback, useEffect, useState } from "react";
import {
  GALLERY_HOME_READY_EVENT,
  GALLERY_REFRESH_EVENT,
} from "@/lib/gallery-admin";
import { getCachedGalleryHome, loadGalleryHome } from "@/lib/gallery-home-cache";
import type { GalleryHomeData } from "@/lib/gallery-home-data";

export type GalleryHomeSlice = "trips" | "people" | "places" | "things";

type UseGalleryHomeSliceOptions = {
  /** When true, bypass cache and refetch from the API. */
  force?: boolean;
};

export function useGalleryHomeSlice<T extends GalleryHomeSlice>(
  slice: T,
  options?: UseGalleryHomeSliceOptions,
) {
  type Value = GalleryHomeData[T];

  const force = options?.force ?? false;
  const [value, setValue] = useState<Value>(() => {
    const cached = getCachedGalleryHome();
    return (cached?.[slice] ?? []) as Value;
  });
  const [ready, setReady] = useState(() => Boolean(getCachedGalleryHome()));

  const sync = useCallback(() => {
    const cached = getCachedGalleryHome();
    if (!cached) {
      setReady(false);
      return;
    }
    setValue(cached[slice] as Value);
    setReady(true);
  }, [slice]);

  useEffect(() => {
    sync();
    void loadGalleryHome({ force }).finally(() => {
      sync();
      setReady(true);
    });
    window.addEventListener(GALLERY_HOME_READY_EVENT, sync);
    window.addEventListener(GALLERY_REFRESH_EVENT, sync);
    return () => {
      window.removeEventListener(GALLERY_HOME_READY_EVENT, sync);
      window.removeEventListener(GALLERY_REFRESH_EVENT, sync);
    };
  }, [force, sync]);

  return {
    value,
    loading: !ready && value.length === 0,
  };
}
