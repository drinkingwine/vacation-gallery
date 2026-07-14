"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Pencil } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { findPhotoByName } from "@/lib/gallery";
import { photoEditPath } from "@/lib/edit-paths";
import { isVideo as isVideoFilename } from "@/lib/media";
import { formatPhotoTimestamp } from "@/lib/photo-details";
import type { Photo, Trip } from "@/lib/types";

export default function WatchVideoPageClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tripName = decodeURIComponent(params.slug as string);
  const videoName = decodeURIComponent(params.video as string);
  const { isAdmin } = useAuth();

  const returnTo = searchParams.get("from");
  const tripHref = `/trips/${encodeURIComponent(tripName)}`;
  const backHref = returnTo ?? tripHref;
  const editHref = photoEditPath(tripName, videoName, backHref);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [video, setVideo] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const load = useCallback(async () => {
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

      const tripData = (await tripRes.json()) as Trip;
      const photosData = (await photosRes.json()) as Photo[];
      const found = findPhotoByName(photosData, videoName);

      if (!found) {
        throw new Error("Video not found");
      }
      if (found.mediaType !== "video" && !isVideoFilename(found.name)) {
        router.replace(
          `/trips/${encodeURIComponent(tripName)}/photos/${encodeURIComponent(videoName)}/edit?from=${encodeURIComponent(backHref)}`,
        );
        return;
      }

      setTrip(tripData);
      setVideo(found);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load video");
    } finally {
      setLoading(false);
    }
  }, [backHref, router, tripName, videoName]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !video) return;
    el.muted = true;
    const playPromise = el.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        // Autoplay may be blocked; controls remain available.
      });
    }
  }, [video]);

  const title = useMemo(
    () => video?.caption?.trim() || video?.name || videoName,
    [video, videoName],
  );
  const tripTitle = trip?.title ?? tripName.replace(/-/g, " ");
  const captured = formatPhotoTimestamp(video?.dateTaken);
  const location = video?.location ?? trip?.location ?? null;

  if (loading) {
    return (
      <div className="trip-page-shell flex min-h-[50vh] flex-1 flex-col">
        <div className="page-container main-offset mx-auto px-0 py-16 text-sm text-zinc-500">
          Loading…
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="trip-page-shell flex min-h-[50vh] flex-1 flex-col">
        <div className="page-container main-offset mx-auto space-y-4 px-0 py-16">
          <p className="text-sm text-red-600 dark:text-red-400">
            {error ?? "Video not found"}
          </p>
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to trip
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="trip-page-shell flex flex-1 flex-col bg-[#12100e] text-[#f7f4ef]">
      <main className="page-container main-offset mx-auto flex w-full flex-1 flex-col px-0 pb-12">
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5">
          <header className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 text-sm text-white/70 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              {tripTitle}
            </Link>
            {isAdmin ? (
              <Link
                href={editHref}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80 transition hover:border-white/35 hover:bg-white/5 hover:text-white"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Link>
            ) : null}
          </header>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_24px_80px_rgb(0_0_0/0.45)]">
            <video
              ref={videoRef}
              key={video.downloadUrl}
              src={video.downloadUrl}
              controls
              playsInline
              autoPlay
              muted
              preload="metadata"
              className="aspect-video max-h-[min(72dvh,46rem)] w-full bg-black object-contain"
            />
          </div>

          <section className="space-y-2 px-1">
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {title}
            </h1>
            <p className="text-sm text-white/55">
              {[location, captured].filter(Boolean).join(" · ") || tripTitle}
            </p>
            {video.caption?.trim() && video.caption.trim() !== title ? (
              <p className="max-w-2xl text-sm leading-relaxed text-white/70">
                {video.caption}
              </p>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}
