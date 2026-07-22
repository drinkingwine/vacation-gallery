"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useConfirm } from "@/components/ConfirmProvider";
import { GallerySelectionShell } from "@/components/gallery/GallerySelectionShell";
import { LightGalleryTripPicker } from "@/components/gallery/LightGalleryTripPicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGalleryHomeSlice } from "@/hooks/use-gallery-home-cache";
import { isFavoritesTrip } from "@/lib/favorites-trip";
import { refreshGallery } from "@/lib/gallery-admin";
import { invalidateGalleryHomeCache } from "@/lib/gallery-home-cache";
import { galleryCopy } from "@/lib/gallery-copy";
import {
  sortTripsWithFavoritesFirst,
  type TripSortMode,
} from "@/lib/trip-meta";
import type { Trip } from "@/lib/types";

export function GalleryTripSelection() {
  const { value: trips, loading } = useGalleryHomeSlice("trips");
  const [sortMode, setSortMode] = useState<TripSortMode>("date");
  const sortedTrips = useMemo(
    () => sortTripsWithFavoritesFirst(trips, sortMode),
    [sortMode, trips],
  );
  const [deletingTrip, setDeletingTrip] = useState<string | null>(null);
  const { isAdmin } = useAuth();
  const confirm = useConfirm();

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
      loading={loading}
      empty={!loading && sortedTrips.length === 0}
      contentClassName="contents"
      actions={
        !loading && sortedTrips.length > 0 ? (
          <Select
            value={sortMode}
            onValueChange={(value) => setSortMode(value as TripSortMode)}
          >
            <SelectTrigger
              aria-label="Sort trips"
              className="h-9 w-auto min-w-[140px] rounded-full border border-zinc-200 bg-white/50 px-4 text-xs backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/50"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date" className="text-xs">
                Sort by date
              </SelectItem>
              <SelectItem value="title" className="text-xs">
                Sort by title
              </SelectItem>
            </SelectContent>
          </Select>
        ) : null
      }
      emptyMessage={
        <div>
          <p className="font-serif text-xl text-zinc-800 dark:text-zinc-100">
            No trips yet
          </p>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {isAdmin
              ? "Create an album from the dashboard, then upload photos."
              : "Sign in as admin to add trips and photos."}
          </p>
          {isAdmin ? (
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/dashboard"
                className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
              >
                Open dashboard
              </Link>
            </div>
          ) : null}
        </div>
      }
    >
      <LightGalleryTripPicker
        trips={sortedTrips}
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
