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
import { refreshGallery } from "@/lib/gallery-admin";
import { invalidateGalleryHomeCache } from "@/lib/gallery-home-cache";
import { galleryCopy } from "@/lib/gallery-copy";
import { stuffGalleryPathForTrip } from "@/lib/stuff-gallery";
import {
  sortTripsByDateDesc,
  sortTripsByTitle,
  type TripSortMode,
} from "@/lib/trip-meta";
import type { Trip } from "@/lib/types";

export function GalleryStuffSelection() {
  const { value: stuff, loading } = useGalleryHomeSlice("stuff");
  const [sortMode, setSortMode] = useState<TripSortMode>("date");
  const sortedStuff = useMemo(
    () =>
      sortMode === "title"
        ? sortTripsByTitle(stuff)
        : sortTripsByDateDesc(stuff),
    [sortMode, stuff],
  );
  const [deletingTrip, setDeletingTrip] = useState<string | null>(null);
  const { isAdmin } = useAuth();
  const confirm = useConfirm();

  const handleDeleteTrip = async (trip: Trip) => {
    const confirmed = await confirm({
      title: "Are you sure?",
      message: `Delete "${trip.title}" and all ${trip.photoCount} photos? This cannot be undone.`,
    });
    if (!confirmed) return;

    setDeletingTrip(trip.name);
    try {
      const res = await fetch(`/api/trips/${encodeURIComponent(trip.name)}`, {
        method: "DELETE",
      });
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
      title="Stuff"
      loading={loading}
      empty={!loading && sortedStuff.length === 0}
      contentClassName="contents"
      actions={
        !loading && sortedStuff.length > 0 ? (
          <Select
            value={sortMode}
            onValueChange={(value) => setSortMode(value as TripSortMode)}
          >
            <SelectTrigger
              aria-label="Sort stuff"
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
            No stuff yet
          </p>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {isAdmin
              ? "Create a stuff album from the dashboard, then upload photos."
              : galleryCopy.stuff.empty}
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
        trips={sortedStuff}
        getHref={stuffGalleryPathForTrip}
        isAdmin={isAdmin}
        onDelete={
          isAdmin
            ? (trip) => {
                void handleDeleteTrip(trip);
              }
            : undefined
        }
        deletingName={deletingTrip}
      />
    </GallerySelectionShell>
  );
}
