"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Star } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { PhotoDetailsSection } from "@/components/gallery/photo-detail/PhotoDetailsSection";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { isFavoritesTrip } from "@/lib/favorites-trip";
import { PresetTagSectionList } from "@/components/gallery/PresetTagSectionList";
import { formFieldClass } from "@/lib/form-styles";
import { findPhotoByName, getEditablePhotoTags, stripAutoPhotoTags } from "@/lib/gallery";
import { galleryCopy } from "@/lib/gallery-copy";
import {
  FAVORITE_TAG,
  formatTagLabel,
  hasFavoriteTag,
  hasPhotoTag,
  isPresetPhotoTag,
  PRESET_PHOTO_TAGS,
} from "@/lib/photo-tags";
import type { Photo, Trip } from "@/lib/types";

const editCardClass =
  "overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900";

export default function EditPhotoPageClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tripName = decodeURIComponent(params.slug as string);
  const photoName = decodeURIComponent(params.photo as string);
  const { isAdmin, loading: authLoading } = useAuth();

  const returnTo = searchParams.get("from");
  const tripHref = `/trips/${encodeURIComponent(tripName)}`;
  const cancelHref = returnTo ?? tripHref;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filename, setFilename] = useState("");
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const initialFavoriteRef = useRef(false);
  const [width, setWidth] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadPhoto = useCallback(async () => {
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
      const photos = (await photosRes.json()) as Photo[];
      const match = findPhotoByName(photos, photoName);

      if (!match) {
        throw new Error("Photo not found in this trip");
      }

      const favorited =
        hasFavoriteTag(match.tags) || isFavoritesTrip(tripName);
      initialFavoriteRef.current = favorited;

      setTrip(tripData);
      setPhoto(match);
      setFilename(match.name);
      setCaption(match.caption ?? "");
      setTags(getEditablePhotoTags(match, tripData));
      setIsFavorite(favorited);
      setWidth(null);
      setHeight(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load photo");
    } finally {
      setLoading(false);
    }
  }, [photoName, tripName]);

  useEffect(() => {
    loadPhoto();
  }, [loadPhoto]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) router.replace(cancelHref);
  }, [authLoading, cancelHref, isAdmin, router]);

  const previewUrl = useMemo(() => photo?.downloadUrl ?? null, [photo]);
  const isVideo = photo?.mediaType === "video";
  const displayTitle = caption.trim() || photo?.name || photoName;
  const tripDisplayName = trip?.title ?? tripName;

  const extraTags = tags.filter((tag) => !isPresetPhotoTag(tag));
  const hasAssignedTags = isFavorite || tags.length > 0;
  const hasAvailablePresetTags = PRESET_PHOTO_TAGS.some(
    (tag) => !hasPhotoTag(tags, tag),
  );

  const assignPresetTag = (tag: string) => {
    const lower = tag.toLowerCase();
    if (hasPhotoTag(tags, lower)) return;
    setTags((current) => [...current, lower]);
  };

  const removeTag = (tag: string) => {
    setTags((current) => current.filter((value) => value !== tag));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo) return;

    setSaving(true);
    setSaveError(null);

    const persistedTags = stripAutoPhotoTags(tags, photo, trip);
    const tagsToSave = isFavorite
      ? [...persistedTags.filter((tag) => tag.toLowerCase() !== FAVORITE_TAG), FAVORITE_TAG]
      : persistedTags.filter((tag) => tag.toLowerCase() !== FAVORITE_TAG);
    const favoriteChanged = isFavorite !== initialFavoriteRef.current;
    const finalPath =
      filename !== photo.name ? `${tripName}/${filename}` : photo.path;

    try {
      const res = await fetch("/api/photos/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: photo.path,
          sha: photo.sha,
          trip: tripName,
          newName: filename !== photo.name ? filename : undefined,
          caption,
          tags: tagsToSave,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");

      if (favoriteChanged) {
        const favoriteRes = await fetch("/api/photos/favorite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trip: tripName,
            path: finalPath,
            favorite: isFavorite,
          }),
        });
        const favoriteData = await favoriteRes.json();
        if (!favoriteRes.ok) {
          throw new Error(favoriteData.error ?? "Failed to update favorite");
        }
      }
      router.push(cancelHref);
      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || (!isAdmin && !loading)) {
    return null;
  }

  return (
    <>
      <Header backHref={cancelHref} backLabel="Back" />

      <div className="trip-page-shell flex flex-1 flex-col">
        <main className="page-container main-offset mx-auto flex-1 px-0 pb-16">
        <div className="mx-auto max-w-4xl space-y-6">
          <header className="space-y-1">
            <h1 className="font-serif text-3xl font-semibold text-zinc-900 dark:text-white">
              Edit photo
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {tripDisplayName}
            </p>
          </header>

          {loading ? (
            <div className="rounded-2xl border border-zinc-200 bg-white/60 p-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
              Loading photo…
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              <p>{error}</p>
              <button
                type="button"
                onClick={loadPhoto}
                className="mt-2 underline"
              >
                Retry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              {saveError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                  {saveError}
                </div>
              )}

              <div className="grid gap-6 md:grid-cols-2">
                <div className={editCardClass}>
                  <div className="space-y-6 p-5">
                    {previewUrl && (
                      <div className="overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-950">
                        {isVideo ? (
                          <video
                            src={previewUrl}
                            controls
                            playsInline
                            className="max-h-64 w-full object-contain"
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={previewUrl}
                            alt={displayTitle}
                            className="max-h-64 w-full object-contain"
                            onLoad={(event) => {
                              const image = event.currentTarget;
                              setWidth(image.naturalWidth);
                              setHeight(image.naturalHeight);
                            }}
                          />
                        )}
                      </div>
                    )}

                    <div className="space-y-1">
                      <h2 className="text-lg font-bold leading-tight text-zinc-900 dark:text-white">
                        {displayTitle}
                      </h2>
                      {photo?.mediaType === "video" ? (
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                          Video
                        </p>
                      ) : null}
                    </div>

                    <PhotoDetailsSection
                      tripName={tripDisplayName}
                      locationName={photo?.location ?? trip?.location ?? null}
                      latitude={photo?.latitude ?? null}
                      longitude={photo?.longitude ?? null}
                      width={width}
                      height={height}
                      size={photo?.size ?? null}
                      dateShot={photo?.dateTaken ?? trip?.startDate ?? null}
                    />

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Filename
                      </label>
                      <input
                        type="text"
                        value={filename}
                        onChange={(e) => setFilename(e.target.value)}
                        className={formFieldClass}
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Caption
                      </label>
                      <textarea
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        rows={3}
                        placeholder="Optional description for this photo"
                        className={formFieldClass}
                      />
                    </div>
                  </div>
                </div>

                <div className={editCardClass}>
                  <div className="space-y-5 p-5">
                    <header className="space-y-1">
                      <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                        Tags
                      </h2>
                    </header>

                    <section className="space-y-3">
                      <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
                        Tags assigned
                      </h3>
                      {hasAssignedTags ? (
                        <div className="space-y-3">
                          {isFavorite ? (
                            <div>
                              <button
                                type="button"
                                onClick={() => setIsFavorite(false)}
                                className="rounded-full border border-rose-300 bg-rose-50 px-2.5 py-1 text-[11px] text-rose-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:border-red-500/40 dark:hover:bg-red-500/20 dark:hover:text-red-300"
                                title="Remove favorite tag"
                              >
                                #{formatTagLabel(FAVORITE_TAG)} ×
                              </button>
                            </div>
                          ) : null}
                          <PresetTagSectionList
                            activeTags={tags}
                            mode="assigned"
                            extraTags={extraTags}
                            onRemove={removeTag}
                          />
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          No tags assigned yet
                        </p>
                      )}
                    </section>

                    <div className="border-t border-zinc-200 dark:border-zinc-800" />

                    <section className="space-y-3">
                      <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
                        Tags to assign
                      </h3>
                      {hasAvailablePresetTags || !isFavorite ? (
                        <div className="space-y-3">
                          <PresetTagSectionList
                            activeTags={tags}
                            mode="available"
                            onAssign={assignPresetTag}
                          />
                          {!isFavorite ? (
                            <div className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
                              <button
                                type="button"
                                onClick={() => setIsFavorite(true)}
                                className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-600 transition hover:bg-amber-500/10 dark:text-amber-300"
                              >
                                <Star className="h-3.5 w-3.5" />
                                {galleryCopy.grid.modal.addFavoriteTag}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          All tags assigned
                        </p>
                      )}
                    </section>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <Link
                  href={cancelHref}
                  className="rounded-xl px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving || !filename.trim()}
                  className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          )}
        </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
