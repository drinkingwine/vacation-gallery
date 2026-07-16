"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useUploadModal } from "@/components/AppShell";
import { useConfirm } from "@/components/ConfirmProvider";
import { FeaturedTripCard } from "@/components/FeaturedTripCard";
import { HomeHero } from "@/components/HomeHero";
import { SectionHeader } from "@/components/SectionHeader";
import { Spinner } from "@/components/gallery/Spinner";
import { useFooterConfig } from "@/components/footer-config";
import { useGalleryHomeSlice } from "@/hooks/use-gallery-home-cache";
import { useGalleryHomeInit } from "@/hooks/use-gallery-home-init";
import type { Trip } from "@/lib/types";
import { totalMediaCount } from "@/lib/media-count";
import { isFavoritesTrip } from "@/lib/favorites-trip";
import { refreshGallery } from "@/lib/gallery-admin";
import { invalidateGalleryHomeCache } from "@/lib/gallery-home-cache";
import { prefetchMapDataWhenIdle } from "@/lib/map-data-cache";

export default function Home() {
  const { loading: homeLoading, error, retry: retryHome } = useGalleryHomeInit();
  const { value: trips, loading: tripsLoading } = useGalleryHomeSlice("trips");
  const showLoading = homeLoading || tripsLoading;
  const [deletingTrip, setDeletingTrip] = useState<string | null>(null);
  const { isAdmin } = useAuth();
  const { openUpload } = useUploadModal();
  const confirm = useConfirm();

  useEffect(() => {
    if (showLoading) return;
    prefetchMapDataWhenIdle();
  }, [showLoading]);

  const totalMedia = trips.reduce((sum, t) => sum + totalMediaCount(t), 0);

  useFooterConfig({
    stats: showLoading
      ? "Loading…"
      : `${totalMedia} item${totalMedia !== 1 ? "s" : ""} across ${trips.length} trip${trips.length !== 1 ? "s" : ""}`,
  });

  const handleDeleteTrip = async (trip: Trip) => {
    if (isFavoritesTrip(trip.name)) return;

    const confirmed = await confirm({
      title: "Are you sure?",
      message: `Delete trip "${trip.title}" and all ${totalMediaCount(trip)} items? This cannot be undone.`,
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
      <main className="relative flex-1 overflow-x-hidden">
        {showLoading ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-50/85 backdrop-blur-sm dark:bg-zinc-950/85"
            role="status"
            aria-live="polite"
            aria-label="Loading gallery"
          >
            <div className="flex flex-col items-center gap-3">
              <Spinner size="lg" />
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Loading gallery…
              </p>
            </div>
          </div>
        ) : null}

        <HomeHero />

        {error && (
          <div className="mx-auto page-container px-0 pt-8">
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
                onClick={() => void retryHome()}
                className="mt-2 text-sm underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <section
          id="trips"
          className="front-fade-up page-container mx-auto space-y-8 px-4 pb-6 pt-[calc(8.5rem+env(safe-area-inset-top,0px))] sm:px-0 sm:pb-16 sm:pt-16 lg:space-y-10"
        >
          <div className="hidden md:block">
            <SectionHeader
              title="Featured trips"
              description="Signature albums blending place, light, and moment into a unified travel narrative."
              actionLabel="View gallery"
              actionHref="/gallery"
            />
          </div>

          {trips.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-zinc-400">
              <p className="text-lg text-zinc-600 dark:text-zinc-300">No trips yet</p>
              <p className="mt-2 text-sm text-zinc-500">
                {isAdmin
                  ? "Upload photos and create your first trip folder."
                  : "Sign in as admin to upload photos."}
              </p>
              {isAdmin && (
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Link
                    href="/trips/new"
                    className="rounded-full border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    New trip
                  </Link>
                  <button
                    type="button"
                    onClick={() => openUpload()}
                    className="rounded-full border border-zinc-900 bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:border-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                  >
                    Upload photos
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {trips.map((trip) => (
                <FeaturedTripCard
                  key={trip.path}
                  trip={trip}
                  isAdmin={isAdmin && !isFavoritesTrip(trip.name)}
                  onDelete={handleDeleteTrip}
                  deleting={deletingTrip === trip.name}
                />
              ))}
            </div>
          )}
        </section>
      </main>

    </>
  );
}
