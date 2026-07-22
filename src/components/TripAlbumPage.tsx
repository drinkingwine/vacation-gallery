"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useUploadModal } from "@/components/AppShell";
import { useConfirm } from "@/components/ConfirmProvider";
import { type GalleryGridMediaFilter } from "@/components/gallery/GalleryGridControls";
import { TripPhotoGallery } from "@/components/TripPhotoGallery";
import { tripEditPath } from "@/lib/edit-paths";
import { isFavoritesTrip } from "@/lib/favorites-trip";
import { formatDateRange } from "@/lib/trip-meta";
import { formatMediaCount } from "@/lib/media-count";
import { formatTagLabel } from "@/lib/photo-tags";
import { GALLERY_REFRESH_EVENT } from "@/lib/gallery-admin";
import {
  getCachedTripPage,
  setCachedTripPage,
} from "@/lib/trip-page-cache";
import type { Photo, Trip } from "@/lib/types";

type TripAlbumPageProps = {
  tripName: string;
  /** Where to go after delete. Defaults to home. */
  afterDeleteHref?: string;
};

export function TripAlbumPage({
  tripName,
  afterDeleteHref = "/",
}: TripAlbumPageProps) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingTrip, setDeletingTrip] = useState(false);
  const [mediaFilter, setMediaFilter] = useState<GalleryGridMediaFilter>("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const { isAdmin } = useAuth();
  const { openUpload } = useUploadModal();
  const confirm = useConfirm();
  const router = useRouter();

  const tagOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const photo of photos) {
      for (const raw of photo.tags ?? []) {
        const tag = raw.trim().toLowerCase();
        if (!tag) continue;
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return formatTagLabel(a.tag).localeCompare(formatTagLabel(b.tag));
      });
  }, [photos]);

  useEffect(() => {
    if (!tagFilter) return;
    const stillPresent = tagOptions.some(
      (option) => option.tag === tagFilter.toLowerCase(),
    );
    if (!stillPresent) setTagFilter(null);
  }, [tagFilter, tagOptions]);

  const fetchTrip = useCallback(
    async (options?: { background?: boolean }) => {
      const background = options?.background ?? false;
      const cached = getCachedTripPage(tripName);

      if (!background) {
        if (cached) {
          setTrip(cached.trip);
          setPhotos(cached.photos);
          setLoading(false);
        } else {
          setLoading(true);
        }
      }

      setError(null);
      try {
        const [tripRes, photosRes] = await Promise.all([
          fetch(`/api/trips/${encodeURIComponent(tripName)}`),
          fetch(`/api/photos?trip=${encodeURIComponent(tripName)}`),
        ]);

        if (!tripRes.ok) {
          const data = await tripRes.json();
          throw new Error(data.error ?? `HTTP ${tripRes.status}`);
        }
        if (!photosRes.ok) {
          const data = await photosRes.json();
          throw new Error(data.error ?? `HTTP ${photosRes.status}`);
        }

        const tripData = (await tripRes.json()) as Trip;
        const photosData = (await photosRes.json()) as Photo[];
        setTrip(tripData);
        setPhotos(photosData);
        setCachedTripPage(tripName, tripData, photosData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load trip");
      } finally {
        setLoading(false);
      }
    },
    [tripName],
  );

  useEffect(() => {
    const cached = getCachedTripPage(tripName);
    if (cached) {
      setTrip(cached.trip);
      setPhotos(cached.photos);
      setLoading(false);
      void fetchTrip({ background: true });
      return;
    }
    void fetchTrip();
  }, [fetchTrip, tripName]);

  useEffect(() => {
    const refresh = () => {
      void fetchTrip({ background: true });
    };
    window.addEventListener(GALLERY_REFRESH_EVENT, refresh);
    return () => window.removeEventListener(GALLERY_REFRESH_EVENT, refresh);
  }, [fetchTrip]);

  const dates = trip ? formatDateRange(trip.startDate, trip.endDate) : null;
  const title = trip?.title ?? tripName.replace(/-/g, " ");
  const isFavorites = isFavoritesTrip(tripName);

  const handleDeleteTrip = async () => {
    if (isFavorites) return;

    const confirmed = await confirm({
      title: "Are you sure?",
      message: `Delete "${trip?.title ?? tripName}" and all its photos? This cannot be undone.`,
    });
    if (!confirmed) return;

    setDeletingTrip(true);
    try {
      const res = await fetch(`/api/trips/${encodeURIComponent(tripName)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      router.push(afterDeleteHref);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
      setDeletingTrip(false);
    }
  };

  return (
    <div className="trip-page-shell flex flex-1 flex-col">
      <main className="main-offset relative z-0 flex-1 pb-16">
        <section className="page-container mx-auto space-y-8 px-0 py-8 sm:py-12">
          <header className="space-y-2 px-1">
            <h1 className="min-w-0 font-serif text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-4xl">
              {title}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {[trip?.location, dates, formatMediaCount(photos)]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {trip?.description ? (
              <p className="max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                {trip.description}
              </p>
            ) : null}
          </header>

          {isAdmin && (
            <div className="flex flex-wrap justify-end gap-2">
              {!isFavorites ? (
                <button
                  type="button"
                  onClick={() => openUpload(tripName)}
                  className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium uppercase tracking-[0.15em] text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
                >
                  Upload
                </button>
              ) : null}
              <Link
                href={tripEditPath(tripName)}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium uppercase tracking-[0.15em] text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
              >
                Edit
              </Link>
              {!isFavorites ? (
                <button
                  type="button"
                  onClick={handleDeleteTrip}
                  disabled={deletingTrip}
                  className="rounded-full border border-red-200 px-4 py-2 text-xs font-medium uppercase tracking-[0.15em] text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  {deletingTrip ? "Deleting…" : "Delete"}
                </button>
              ) : null}
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
              <p className="text-sm">{error}</p>
              <button
                type="button"
                onClick={() => {
                  void fetchTrip();
                }}
                className="mt-2 text-sm underline"
              >
                Retry
              </button>
            </div>
          )}

          <TripPhotoGallery
            photos={photos}
            trip={trip}
            tripName={tripName}
            loading={loading}
            emptyMessage={`No photos in "${title}" yet. Upload some!`}
            isAdmin={isAdmin}
            coverPhoto={trip?.coverPhoto ?? null}
            coverUrl={trip?.coverUrl ?? null}
            mediaFilter={mediaFilter}
            onMediaFilterChange={setMediaFilter}
            tagFilter={tagFilter}
            onTagFilterChange={setTagFilter}
            tagOptions={tagOptions}
            onPhotoChanged={() => {
              void fetchTrip({ background: true });
            }}
          />
        </section>
      </main>
    </div>
  );
}
