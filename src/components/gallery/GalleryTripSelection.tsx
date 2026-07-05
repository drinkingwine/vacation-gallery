"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { CreateTripModal } from "@/components/CreateTripModal";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { TripCard } from "@/components/TripCard";
import { UploadModal } from "@/components/UploadModal";
import { cn } from "@/lib/utils";
import type { Trip } from "@/lib/types";

export function GalleryTripSelection() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showCreateTrip, setShowCreateTrip] = useState(false);
  const [deletingTrip, setDeletingTrip] = useState<string | null>(null);
  const { isAdmin } = useAuth();

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/trips");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setTrips(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trips");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const handleDeleteTrip = async (trip: Trip) => {
    if (
      !confirm(
        `Delete trip "${trip.title}" and all ${trip.photoCount} photos? This cannot be undone.`,
      )
    ) {
      return;
    }

    setDeletingTrip(trip.name);
    try {
      const res = await fetch(
        `/api/trips/${encodeURIComponent(trip.name)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      fetchTrips();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingTrip(null);
    }
  };

  return (
    <>
      <Header
        onUpload={isAdmin ? () => setShowUpload(true) : undefined}
        onCreateTrip={isAdmin ? () => setShowCreateTrip(true) : undefined}
      />

      <main className="mx-auto w-[88vw] max-w-none flex-1 px-0 pb-16 pt-24">
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
            <Link
              href="/gallery/all"
              className="inline-flex text-xs uppercase tracking-[0.25em] text-zinc-500 transition hover:text-zinc-900 dark:text-white/50 dark:hover:text-white"
            >
              Browse all photos →
            </Link>
          </header>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              <p>{error}</p>
              <button
                type="button"
                onClick={fetchTrips}
                className="mt-2 underline"
              >
                Retry
              </button>
            </div>
          ) : null}

          {loading ? (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-video animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800"
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
                  <button
                    type="button"
                    onClick={() => setShowCreateTrip(true)}
                    className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-600 dark:text-zinc-200"
                  >
                    New trip
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUpload(true)}
                    className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
                  >
                    Upload photos
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {trips.map((trip) => (
                <TripCard
                  key={trip.path}
                  trip={trip}
                  isAdmin={isAdmin}
                  onDelete={handleDeleteTrip}
                  deleting={deletingTrip === trip.name}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

      {showCreateTrip && isAdmin && (
        <CreateTripModal
          onClose={() => setShowCreateTrip(false)}
          onCreated={() => fetchTrips()}
        />
      )}

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
