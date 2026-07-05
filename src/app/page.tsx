"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Header } from "@/components/Header";
import { TripCard } from "@/components/TripCard";
import { UploadModal } from "@/components/UploadModal";
import type { Trip } from "@/lib/types";

export default function Home() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
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
      const data: Trip[] = await res.json();
      setTrips(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trips");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const totalPhotos = trips.reduce((sum, t) => sum + t.photoCount, 0);

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
      <Header onUpload={isAdmin ? () => setShowUpload(true) : undefined} />

      <main className="flex-1">
        <section className="border-b border-stone-200/80 bg-white/50 px-6 py-16 text-center">
          <div className="mx-auto max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-widest text-terracotta">
              Photo library
            </p>
            <h1 className="font-display mt-3 text-5xl font-medium tracking-tight text-stone-900 sm:text-6xl">
              Every trip, every moment
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-stone-600">
              Photos stored in GitHub — browse by trip, upload from anywhere.
            </p>
          </div>
        </section>

        {error && (
          <div className="mx-auto max-w-6xl px-6 pt-8">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              <p className="text-sm font-medium">Failed to load trips</p>
              <p className="mt-1 text-sm opacity-80">{error}</p>
              {error.includes("GITHUB") && (
                <p className="mt-2 text-xs opacity-70">
                  Set <code className="rounded bg-red-100 px-1">GITHUB_TOKEN</code> and{" "}
                  <code className="rounded bg-red-100 px-1">GITHUB_REPO</code> in{" "}
                  <code className="rounded bg-red-100 px-1">.env.local</code>. See README.
                </p>
              )}
              <button
                type="button"
                onClick={fetchTrips}
                className="mt-2 text-sm underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <section className="mx-auto max-w-6xl px-6 py-12">
          {loading ? (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[4/3] animate-pulse rounded-2xl bg-stone-200"
                />
              ))}
            </div>
          ) : trips.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-stone-400">
              <p className="text-lg text-stone-600">No trips yet</p>
              <p className="mt-2 text-sm">
                {isAdmin
                  ? "Upload photos and create your first trip folder."
                  : "Sign in as admin to upload photos."}
              </p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowUpload(true)}
                  className="mt-6 rounded-full bg-terracotta px-6 py-2.5 text-sm font-medium text-white hover:bg-terracotta/90"
                >
                  Upload photos
                </button>
              )}
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
        </section>
      </main>

      <footer className="border-t border-stone-200/80 px-6 py-8 text-center text-sm text-stone-500">
        {loading
          ? "Loading…"
          : `${totalPhotos} photos across ${trips.length} trip${trips.length !== 1 ? "s" : ""}`}
      </footer>

      {showUpload && isAdmin && (
        <UploadModal
          trips={trips}
          onClose={() => setShowUpload(false)}
          onUploadComplete={() => {
            fetchTrips();
          }}
        />
      )}
    </>
  );
}
