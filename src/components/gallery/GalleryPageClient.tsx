"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { UploadModal } from "@/components/UploadModal";
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

  return (
    <>
      <Header onUpload={isAdmin ? () => setShowUpload(true) : undefined} />
      {children}
      <Footer />

      {showUpload && isAdmin && (
        <UploadModal
          trips={trips}
          onClose={() => setShowUpload(false)}
          onUploadComplete={fetchTrips}
        />
      )}
    </>
  );
}
