"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { UploadModal } from "@/components/UploadModal";
import { GALLERY_REFRESH_EVENT, refreshGallery } from "@/lib/gallery-admin";
import type { Trip } from "@/lib/types";

type GalleryPageClientProps = {
  children: React.ReactNode;
};

export function GalleryPageClient({ children }: GalleryPageClientProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const { isAdmin } = useAuth();

  const fetchTrips = useCallback(async () => {
    try {
      const res = await fetch("/api/trips");
      if (res.ok) setTrips(await res.json());
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  useEffect(() => {
    const refresh = () => {
      fetchTrips();
    };
    window.addEventListener(GALLERY_REFRESH_EVENT, refresh);
    return () => window.removeEventListener(GALLERY_REFRESH_EVENT, refresh);
  }, [fetchTrips]);

  return (
    <>
      <Header
        onUpload={isAdmin ? () => setShowUpload(true) : undefined}
      />
      <div className="gallery-page-shell flex flex-1 flex-col">
        {children}
        <Footer />
      </div>

      {showUpload && isAdmin && (
        <UploadModal
          trips={trips}
          onClose={() => setShowUpload(false)}
          onUploadComplete={() => {
            fetchTrips();
            refreshGallery();
          }}
        />
      )}
    </>
  );
}
