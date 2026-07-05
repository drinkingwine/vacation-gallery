"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { CreateTripModal } from "@/components/CreateTripModal";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { TripPhotoGallery } from "@/components/TripPhotoGallery";
import { UploadModal } from "@/components/UploadModal";
import { tripEditPath } from "@/lib/edit-paths";
import { formatDateRange } from "@/lib/trip-meta";
import { cn } from "@/lib/utils";
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
  const [showCreateTrip, setShowCreateTrip] = useState(false);
  const [deletingTrip, setDeletingTrip] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
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

  const heroImages = useMemo(() => {
    const urls = photos.map((p) => p.downloadUrl);
    if (trip?.coverUrl) {
      const rest = urls.filter((url) => url !== trip.coverUrl);
      return [trip.coverUrl, ...rest].slice(0, 8);
    }
    return urls.length > 0 ? urls.slice(0, 8) : [];
  }, [photos, trip?.coverUrl]);

  const safeHeroIndex = heroImages.length ? heroIndex % heroImages.length : 0;
  const dates = trip ? formatDateRange(trip.startDate, trip.endDate) : null;

  useEffect(() => {
    if (heroImages.length <= 1) return;
    const timer = window.setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroImages.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [heroImages.length]);

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
        onUpload={isAdmin ? () => setShowUpload(true) : undefined}
        onCreateTrip={isAdmin ? () => setShowCreateTrip(true) : undefined}
      />

      <div className="trip-page-shell flex flex-1 flex-col">
        <main className="main-offset relative z-0 flex-1 pb-16">
        <section className="front-fade-up page-container relative mx-auto h-[52vh] min-h-[320px] max-h-[900px] overflow-hidden rounded-2xl bg-zinc-100 shadow-2xl shadow-black/10 dark:bg-zinc-900 sm:h-[65vh] sm:min-h-[420px] sm:rounded-[32px] md:h-[78vh] md:min-h-[560px]">
          {heroImages.length > 0 ? (
            heroImages.map((src, index) => (
              <div
                key={`${src}-${index}`}
                className={cn(
                  "absolute inset-0 bg-cover bg-center transition-opacity",
                  index === safeHeroIndex ? "opacity-100" : "opacity-0",
                )}
                style={{
                  backgroundImage: `url(${src})`,
                  transitionDuration: "1200ms",
                }}
              />
            ))
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-rose-400 via-violet-500 to-teal-500 dark:from-indigo-800 dark:via-purple-900 dark:to-teal-900" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-transparent" />

          {heroImages.length > 1 && (
            <div className="absolute bottom-6 right-4 z-20 flex gap-2 sm:bottom-10 sm:right-10">
              {heroImages.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setHeroIndex(index)}
                  className={cn(
                    "h-0.5 transition-all",
                    index === safeHeroIndex ? "w-8 bg-white" : "w-4 bg-white/30",
                  )}
                  aria-label={`Slide ${index + 1}`}
                />
              ))}
            </div>
          )}

          <div className="absolute inset-0 flex items-end px-4 pb-8 pt-20 sm:px-6 sm:pb-10 sm:pt-24 md:px-12 md:pb-14">
            <div className="w-full space-y-4 text-white sm:space-y-6">
              <div className="flex flex-wrap gap-2">
                {trip?.location && (
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80 backdrop-blur-md">
                    {trip.location}
                  </span>
                )}
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80 backdrop-blur-md">
                  {photos.length} photo{photos.length !== 1 ? "s" : ""}
                </span>
              </div>
              <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl md:text-6xl lg:text-7xl">
                {trip?.title ?? tripName.replace(/-/g, " ")}
              </h1>
              {trip?.description && (
                <p className="max-w-2xl text-sm font-light leading-relaxed text-white/70 md:text-lg">
                  {trip.description}
                </p>
              )}
              {dates && (
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/60">
                  {dates}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="page-container mx-auto space-y-8 px-0 py-8 sm:py-12">
          {isAdmin && (
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowUpload(true)}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium uppercase tracking-[0.15em] text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
              >
                Upload
              </button>
              <Link
                href={tripEditPath(tripName)}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium uppercase tracking-[0.15em] text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
              >
                Edit trip
              </Link>
              <button
                type="button"
                onClick={handleDeleteTrip}
                disabled={deletingTrip}
                className="rounded-full border border-red-200 px-4 py-2 text-xs font-medium uppercase tracking-[0.15em] text-red-600 transition hover:bg-red-50 disabled:opacity-50"
              >
                {deletingTrip ? "Deleting…" : "Delete trip"}
              </button>
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

      {showCreateTrip && isAdmin && (
        <CreateTripModal
          onClose={() => setShowCreateTrip(false)}
          onCreated={() => {
            fetchTrips();
            fetchTrip();
          }}
        />
      )}

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
