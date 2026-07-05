"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { FeaturedTripCard } from "@/components/FeaturedTripCard";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { HomeHero } from "@/components/HomeHero";
import { SectionHeader } from "@/components/SectionHeader";
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
        <HomeHero primaryHref="/gallery" secondaryHref="/#trips" />

        {error && (
          <div className="mx-auto w-[88vw] max-w-none px-0 pt-8">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
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

        <section
          id="trips"
          className="front-fade-up mx-auto w-[88vw] max-w-none space-y-8 px-0 py-16 lg:space-y-10"
        >
          <SectionHeader
            title="Featured trips"
            description="Signature albums blending place, light, and moment into a unified travel narrative."
            actionLabel="View all"
            actionHref="/#trips"
          />

          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="min-h-[280px] animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800"
                />
              ))}
            </div>
          ) : trips.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-zinc-400">
              <p className="text-lg text-zinc-600 dark:text-zinc-300">No trips yet</p>
              <p className="mt-2 text-sm text-zinc-500">
                {isAdmin
                  ? "Upload photos and create your first trip folder."
                  : "Sign in as admin to upload photos."}
              </p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowUpload(true)}
                  className="mt-6 rounded-full border border-zinc-900 bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:border-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                >
                  Upload photos
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {trips.map((trip) => (
                <FeaturedTripCard
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

      <Footer
        stats={
          loading
            ? "Loading…"
            : `${totalPhotos} photos across ${trips.length} trip${trips.length !== 1 ? "s" : ""}`
        }
      />

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
