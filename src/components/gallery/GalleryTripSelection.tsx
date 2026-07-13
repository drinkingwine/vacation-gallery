"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useUploadModal } from "@/components/AppShell";
import { useConfirm } from "@/components/ConfirmProvider";
import { GallerySelectionShell } from "@/components/gallery/GallerySelectionShell";
import { LightGalleryTripPicker } from "@/components/gallery/LightGalleryTripPicker";
import { useGalleryHomeSlice } from "@/hooks/use-gallery-home-cache";
import { isFavoritesTrip } from "@/lib/favorites-trip";
import { refreshGallery } from "@/lib/gallery-admin";
import { invalidateGalleryHomeCache } from "@/lib/gallery-home-cache";
import { galleryCopy } from "@/lib/gallery-copy";
import type { Trip } from "@/lib/types";

export function GalleryTripSelection() {
  const { value: trips, loading } = useGalleryHomeSlice("trips");
  const [deletingTrip, setDeletingTrip] = useState<string | null>(null);
  const { isAdmin } = useAuth();
  const confirm = useConfirm();
  const { openUpload } = useUploadModal();

  const handleDeleteTrip = async (trip: Trip) => {
    if (isFavoritesTrip(trip.name)) return;

    const confirmed = await confirm({
      title: "Are you sure?",
      message: `Delete trip "${trip.title}" and all ${trip.photoCount} photos? This cannot be undone.`,
    });
    if (!confirmed) return;

    setDeletingTrip(trip.name);
    try {
      const res = await fetch(
        `/api/trips/${encodeURIComponent(trip.name)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      invalidateGalleryHomeCache();
      refreshGallery();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingTrip(null);
    }
  };

  return (
    <GallerySelectionShell
      title={galleryCopy.title}
      description="Pick a trip to browse its photos."
      count={trips.length}
      countLabel={trips.length === 1 ? "trip" : "trips"}
      loading={loading}
      empty={!loading && trips.length === 0}
      contentClassName="contents"
      emptyMessage={
        <div>
          <p className="font-serif text-xl text-zinc-800 dark:text-zinc-100">
            No trips yet
          </p>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {isAdmin
              ? "Create a trip folder, then upload photos."
              : "Sign in as admin to add trips and photos."}
          </p>
          {isAdmin ? (
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/trips/new"
                className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-600 dark:text-zinc-200"
              >
                New trip
              </Link>
              <button
                type="button"
                onClick={() => openUpload()}
                className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
              >
                Upload photos
              </button>
            </div>
          ) : null}
        </div>
      }
    >
      <LightGalleryTripPicker
        trips={trips}
        isAdmin={isAdmin}
        onDelete={
          isAdmin
            ? (trip) => {
                if (isFavoritesTrip(trip.name)) return;
                void handleDeleteTrip(trip);
              }
            : undefined
        }
        deletingName={deletingTrip}
      />
    </GallerySelectionShell>
  );
}
