"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Header } from "@/components/Header";
import { PhotoGrid } from "@/components/PhotoGrid";
import { UploadModal } from "@/components/UploadModal";
import { formatDateRange } from "@/lib/trip-meta";
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

  const coverUrl = trip?.coverUrl ?? photos[0]?.downloadUrl;
  const dates = trip ? formatDateRange(trip.startDate, trip.endDate) : null;

  const handleDeleteTrip = async () => {
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
        backHref="/"
        backLabel="All trips"
        onUpload={isAdmin ? () => setShowUpload(true) : undefined}
      />

      <main className="flex-1">
        <section className="relative h-[40vh] min-h-[280px] overflow-hidden bg-stone-200">
          {coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt={trip?.title ?? tripName}
              className="h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-10">
            <div className="mx-auto max-w-6xl text-white">
              {trip?.location && (
                <p className="text-sm font-medium uppercase tracking-widest text-white/70">
                  {trip.location}
                </p>
              )}
              <h1 className="font-display mt-2 text-4xl font-medium tracking-tight sm:text-5xl">
                {trip?.title ?? tripName.replace(/-/g, " ")}
              </h1>
              {!loading && (
                <p className="mt-2 text-white/80">
                  {dates && <span>{dates} · </span>}
                  {photos.length} photo{photos.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-10">
          {isAdmin && (
            <div className="mb-6 flex justify-end">
              <button
                type="button"
                onClick={handleDeleteTrip}
                disabled={deletingTrip}
                className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                {deletingTrip ? "Deleting trip…" : "Delete trip"}
              </button>
            </div>
          )}

          {trip?.description && (
            <p className="mb-8 max-w-2xl text-lg leading-relaxed text-stone-600">
              {trip.description}
            </p>
          )}

          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
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

          <PhotoGrid
            photos={photos}
            loading={loading}
            emptyMessage={`No photos in "${trip?.title ?? tripName}" yet. Upload some!`}
            isAdmin={isAdmin}
            onPhotoDeleted={fetchTrip}
          />
        </section>
      </main>

      {showUpload && isAdmin && (
        <UploadModal
          trips={trips}
          defaultTrip={tripName}
          onClose={() => setShowUpload(false)}
          onUploadComplete={fetchTrip}
        />
      )}
    </>
  );
}
