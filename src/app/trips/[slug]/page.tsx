"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { TripPhotoGallery } from "@/components/TripPhotoGallery";
import { UploadModal } from "@/components/UploadModal";
import { GalleryAlbumHero } from "@/components/gallery/GalleryAlbumHero";
import { pickHeroImages } from "@/lib/hero-images";
import { tripEditPath } from "@/lib/edit-paths";
import { isFavoritesTrip } from "@/lib/favorites-trip";
import { formatDateRange } from "@/lib/trip-meta";
import { formatMediaCount } from "@/lib/media-count";
import type { Photo, Trip } from "@/lib/types";

export default function TripPage() {
  const params = useParams();
  const tripName = decodeURIComponent(params.slug as string);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [deletingTrip, setDeletingTrip] = useState(false);
  const { isAdmin } = useAuth();
  const router = useRouter();

  const fetchTrip = useCallback(async () => {
    setLoading(true);
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

      setTrip(await tripRes.json());
      setPhotos(await photosRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trip");
    } finally {
      setLoading(false);
    }
  }, [tripName]);

  const fetchTrips = useCallback(async () => {
    try {
      const res = await fetch("/api/trips");
      if (res.ok) setTrips(await res.json());
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchTrip();
    fetchTrips();
  }, [fetchTrip, fetchTrips]);

  const heroImages = useMemo(
    () =>
      pickHeroImages(
        photos
          .filter((photo) => photo.mediaType !== "video")
          .map((photo) => photo.downloadUrl),
        trip?.coverUrl,
      ),
    [photos, trip?.coverUrl],
  );
  const dates = trip ? formatDateRange(trip.startDate, trip.endDate) : null;

  const isFavorites = isFavoritesTrip(tripName);
  const uploadTrips = trips.filter((trip) => !isFavoritesTrip(trip.name));

  const handleDeleteTrip = async () => {
    if (isFavorites) return;

    if (
      !confirm(
        `Delete trip "${trip?.title ?? tripName}" and all its photos? This cannot be undone.`,
      )
    ) {
      return;
    }

    setDeletingTrip(true);
    try {
      const res = await fetch(
        `/api/trips/${encodeURIComponent(tripName)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      router.push("/");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
      setDeletingTrip(false);
    }
  };

  return (
    <>
      <Header
        onUpload={isAdmin && !isFavorites ? () => setShowUpload(true) : undefined}
      />

      <div className="trip-page-shell flex flex-1 flex-col">
        <main className="main-offset relative z-0 flex-1 pb-16">
        <div className="page-container mx-auto">
          <GalleryAlbumHero
            images={heroImages}
            title={trip?.title ?? tripName.replace(/-/g, " ")}
            badges={[
              ...(trip?.location ? [{ label: trip.location }] : []),
              { label: formatMediaCount(photos) },
            ]}
            description={trip?.description}
            subtitle={dates ?? undefined}
          />
        </div>

        <section className="page-container mx-auto space-y-8 px-0 py-8 sm:py-12">
          {isAdmin && (
            <div className="flex flex-wrap justify-end gap-2">
              {!isFavorites ? (
                <button
                  type="button"
                  onClick={() => setShowUpload(true)}
                  className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium uppercase tracking-[0.15em] text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
                >
                  Upload
                </button>
              ) : null}
              <Link
                href={tripEditPath(tripName)}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium uppercase tracking-[0.15em] text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
              >
                Edit trip
              </Link>
              {!isFavorites ? (
                <button
                  type="button"
                  onClick={handleDeleteTrip}
                  disabled={deletingTrip}
                  className="rounded-full border border-red-200 px-4 py-2 text-xs font-medium uppercase tracking-[0.15em] text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  {deletingTrip ? "Deleting…" : "Delete trip"}
                </button>
              ) : null}
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
              <p className="text-sm">{error}</p>
              <button
                type="button"
                onClick={fetchTrip}
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
            emptyMessage={`No photos in "${trip?.title ?? tripName}" yet. Upload some!`}
            isAdmin={isAdmin}
            coverPhoto={trip?.coverPhoto ?? null}
            coverUrl={trip?.coverUrl ?? null}
            onPhotoChanged={fetchTrip}
          />
        </section>
        </main>

        <Footer />
      </div>

      {showUpload && isAdmin && !isFavorites && (
        <UploadModal
          trips={uploadTrips}
          defaultTrip={tripName}
          onClose={() => setShowUpload(false)}
          onUploadComplete={fetchTrip}
        />
      )}
    </>
  );
}
