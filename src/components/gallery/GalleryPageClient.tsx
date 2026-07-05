"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { CreateTripModal } from "@/components/CreateTripModal";
import { EditPhotoModal } from "@/components/EditPhotoModal";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { UploadModal } from "@/components/UploadModal";
import {
  GALLERY_EDIT_EVENT,
  galleryItemToPhoto,
  refreshGallery,
} from "@/lib/gallery-admin";
import type { GalleryItem } from "@/lib/gallery";
import type { Photo, Trip } from "@/lib/types";

type GalleryPageClientProps = {
  children: React.ReactNode;
};

export function GalleryPageClient({ children }: GalleryPageClientProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [showCreateTrip, setShowCreateTrip] = useState(false);
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
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
    if (!isAdmin) return;

    const onEdit = (event: Event) => {
      const detail = (event as CustomEvent<GalleryItem>).detail;
      if (detail) setEditingItem(detail);
    };

    window.addEventListener(GALLERY_EDIT_EVENT, onEdit);
    return () => window.removeEventListener(GALLERY_EDIT_EVENT, onEdit);
  }, [isAdmin]);

  const handlePhotoSaved = () => {
    setEditingItem(null);
    refreshGallery();
    fetchTrips();
  };

  const editingPhoto: Photo | null = editingItem
    ? galleryItemToPhoto(editingItem)
    : null;

  return (
    <>
      <Header
        onUpload={isAdmin ? () => setShowUpload(true) : undefined}
        onCreateTrip={isAdmin ? () => setShowCreateTrip(true) : undefined}
      />
      {children}
      <Footer />

      {showCreateTrip && isAdmin && (
        <CreateTripModal
          onClose={() => setShowCreateTrip(false)}
          onCreated={() => {
            fetchTrips();
            refreshGallery();
          }}
        />
      )}

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

      {editingPhoto && editingItem?.tripName && isAdmin && (
        <EditPhotoModal
          photo={editingPhoto}
          tripName={editingItem.tripName}
          onClose={() => setEditingItem(null)}
          onSaved={handlePhotoSaved}
        />
      )}
    </>
  );
}
