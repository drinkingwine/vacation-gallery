"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useUploadModal } from "@/components/AppShell";
import { useConfirm } from "@/components/ConfirmProvider";
import { TripCard } from "@/components/TripCard";
import { useGalleryHomeSlice } from "@/hooks/use-gallery-home-cache";
import { isFavoritesTrip } from "@/lib/favorites-trip";
import { refreshGallery } from "@/lib/gallery-admin";
import { invalidateGalleryHomeCache } from "@/lib/gallery-home-cache";
import { cn } from "@/lib/utils";
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
    <>
      <div className="gallery-page-shell flex flex-1 flex-col">
        <main className="page-container main-offset mx-auto flex-1 px-0 pb-16">
        <div className="space-y-10">
          <header className="front-fade-up space-y-4">
            <h1
              className={cn(
                "font-serif",
                "text-4xl font-semibold text-zinc-800/90 dark:text-white/85 md:text-5xl",
              )}
            >
              Gallery
            </h1>
          </header>

          {loading ? (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-video animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-600"
                />
              ))}
            </div>
          ) : trips.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white/60 p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/60">
              <p className="text-lg text-zinc-700 dark:text-zinc-200">
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
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
              {trips.map((trip, index) => (
                <TripCard
                  key={trip.path}
                  trip={trip}
                  priority={index < 6}
                  isAdmin={isAdmin && !isFavoritesTrip(trip.name)}
                  onDelete={handleDeleteTrip}
                  deleting={deletingTrip === trip.name}
                />
              ))}
            </div>
          )}
        </div>
        </main>
      </div>
    </>
  );
}
