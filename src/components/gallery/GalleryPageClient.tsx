"use client";

import { useCallback, useEffect, useState } from "react";
import { GALLERY_REFRESH_EVENT, refreshGallery } from "@/lib/gallery-admin";

type GalleryPageClientProps = {
  children: React.ReactNode;
};

export function GalleryPageClient({ children }: GalleryPageClientProps) {
  const [, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(() => {
    setRefreshKey((key) => key + 1);
    refreshGallery();
  }, []);

  useEffect(() => {
    window.addEventListener(GALLERY_REFRESH_EVENT, handleRefresh);
    return () => window.removeEventListener(GALLERY_REFRESH_EVENT, handleRefresh);
  }, [handleRefresh]);

  return (
    <div className="gallery-page-shell flex flex-1 flex-col">
      {children}
    </div>
  );
}
