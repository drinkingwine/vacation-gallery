"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Star } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import {
  MakeDefaultIconButton,
} from "@/components/gallery/PhotoOverlayIcons";
import { PhotoDetailsSection } from "@/components/gallery/photo-detail/PhotoDetailsSection";
import { LocationPreviewMap } from "@/components/map/LocationPreviewMap";
import { isFavoritesTrip } from "@/lib/favorites-trip";
import { GALLERY_REFRESH_EVENT, refreshGallery } from "@/lib/gallery-admin";
import { invalidateGalleryHomeCache } from "@/lib/gallery-home-cache";
import { patchCachedTripPhoto } from "@/lib/trip-page-cache";
import { PresetTagSectionList } from "@/components/gallery/PresetTagSectionList";
import { formFieldClass } from "@/lib/form-styles";
import { findPhotoByName, getEditablePhotoTags, stripAutoPhotoTags } from "@/lib/gallery";
import { galleryCopy } from "@/lib/gallery-copy";
import { googleMapsPlaceUrl } from "@/lib/map";
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "@/lib/photo-timestamp";
import {
  FAVORITE_TAG,
  formatTagLabel,
  hasFavoriteTag,
  hasPhotoTag,
  isPresetPhotoTag,
  PRESET_PHOTO_TAGS,
} from "@/lib/photo-tags";
import type { Photo, Trip } from "@/lib/types";
import { cn } from "@/lib/utils";

const editCardClass =
  "rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900";

const editPhotoCardClass = `${editCardClass} overflow-hidden`;

const editTagsCardClass =
  "lg:sticky lg:top-28 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto custom-scrollbar";

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
  const [captured, setCaptured] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const initialFavoriteRef = useRef(false);
  const [width, setWidth] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [makingDefault, setMakingDefault] = useState(false);

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
      setCaptured(toDatetimeLocalValue(match.dateTaken));
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
  const isDefaultPhoto = Boolean(
    photo && trip?.coverPhoto && trip.coverPhoto === photo.name,
  );
  const canSetDefault = Boolean(
    photo && !isVideo && !isFavoritesTrip(tripName),
  );
  const displayTitle = caption.trim() || photo?.name || photoName;
  const tripDisplayName = trip?.title ?? tripName;

  const geo = useMemo(() => {
    const latitude =
      typeof photo?.latitude === "number" && Number.isFinite(photo.latitude)
        ? photo.latitude
        : typeof trip?.latitude === "number" && Number.isFinite(trip.latitude)
          ? trip.latitude
          : null;
    const longitude =
      typeof photo?.longitude === "number" && Number.isFinite(photo.longitude)
        ? photo.longitude
        : typeof trip?.longitude === "number" && Number.isFinite(trip.longitude)
          ? trip.longitude
          : null;
    const locationName =
      photo?.location?.trim() ||
      trip?.location?.trim() ||
      trip?.geoLocation?.trim() ||
      null;
    const source: "photo" | "trip" | "label" | null =
      typeof photo?.latitude === "number" &&
      typeof photo?.longitude === "number" &&
      Number.isFinite(photo.latitude) &&
      Number.isFinite(photo.longitude)
        ? "photo"
        : typeof trip?.latitude === "number" &&
            typeof trip?.longitude === "number" &&
            Number.isFinite(trip.latitude) &&
            Number.isFinite(trip.longitude)
          ? "trip"
          : locationName
            ? "label"
            : null;
    return { latitude, longitude, locationName, source };
  }, [photo, trip]);
  const capturedPreview =
    fromDatetimeLocalValue(captured) ?? photo?.dateTaken ?? trip?.startDate ?? null;

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

  const handleToggleDefault = async () => {
    if (!photo || !canSetDefault || makingDefault) return;

    setMakingDefault(true);
    setSaveError(null);

    const nextIsDefault = !isDefaultPhoto;

    try {
      const res = await fetch(
        `/api/trips/${encodeURIComponent(tripName)}/cover`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            nextIsDefault
              ? { photoName: photo.name }
              : { photoName: null, clear: true },
          ),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error ??
            (nextIsDefault
              ? "Failed to set default photo"
              : "Failed to clear default photo"),
        );
      }

      setTrip((current) =>
        current
          ? {
              ...current,
              coverPhoto: nextIsDefault ? photo.name : undefined,
              coverUrl: nextIsDefault
                ? photo.downloadUrl
                : (data.coverUrl ?? current.coverUrl),
            }
          : current,
      );
      window.dispatchEvent(new Event(GALLERY_REFRESH_EVENT));
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to update default photo",
      );
    } finally {
      setMakingDefault(false);
    }
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
    const initialCaptured = toDatetimeLocalValue(photo.dateTaken);
    const capturedChanged = captured !== initialCaptured;
    const nextDateTaken = captured.trim()
      ? fromDatetimeLocalValue(captured)
      : undefined;

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
          ...(capturedChanged
            ? { dateTaken: nextDateTaken ?? null }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");

      if (isDefaultPhoto && filename !== photo.name) {
        const coverRes = await fetch(
          `/api/trips/${encodeURIComponent(tripName)}/cover`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ photoName: filename }),
          },
        );
        const coverData = await coverRes.json();
        if (!coverRes.ok) {
          throw new Error(coverData.error ?? "Failed to update default photo");
        }
      }

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

      patchCachedTripPhoto(tripName, photo.path, {
        name: filename,
        path: finalPath,
        caption,
        tags: tagsToSave,
        ...(capturedChanged ? { dateTaken: nextDateTaken } : {}),
      });
      invalidateGalleryHomeCache();
      refreshGallery();
      router.push(cancelHref);
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
    <div className="trip-page-shell flex flex-1 flex-col">
        <main className="page-container main-offset mx-auto flex-1 px-0 pb-16">
        <div className="mx-auto max-w-6xl space-y-6">
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
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={cancelHref}
                  className="rounded-full border border-amber-400/60 bg-amber-50 px-5 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100 dark:hover:bg-amber-500/25"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving || !filename.trim()}
                  className="rounded-full bg-green-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>

              {saveError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                  {saveError}
                </div>
              )}

              <div className="grid items-start gap-6 lg:grid-cols-3">
                <div className={editPhotoCardClass}>
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
                      locationName={geo.locationName}
                      latitude={geo.latitude}
                      longitude={geo.longitude}
                      width={width}
                      height={height}
                      size={photo?.size ?? null}
                      dateShot={capturedPreview}
                      showEmptyLocation
                      locationSource={geo.source}
                    />

                    {geo.latitude != null && geo.longitude != null ? (
                      <section className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                            Map
                            {geo.source === "trip" ? (
                              <span className="ml-2 font-medium normal-case tracking-normal text-zinc-500">
                                (trip location)
                              </span>
                            ) : null}
                          </h3>
                          <a
                            href={googleMapsPlaceUrl(
                              geo.latitude,
                              geo.longitude,
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 underline decoration-zinc-300 underline-offset-2 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:decoration-zinc-600 dark:hover:text-zinc-100"
                          >
                            Open map
                          </a>
                        </div>
                        <LocationPreviewMap
                          latitude={geo.latitude}
                          longitude={geo.longitude}
                          label={geo.locationName}
                          heightClassName="h-56"
                          className="rounded-xl"
                          compact
                        />
                      </section>
                    ) : null}

                    {canSetDefault ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <MakeDefaultIconButton
                          variant="toolbar"
                          active={isDefaultPhoto}
                          busy={makingDefault}
                          disabled={makingDefault || saving}
                          onClick={() => void handleToggleDefault()}
                        />
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {isDefaultPhoto
                            ? "Default trip cover"
                            : "Set as default trip cover"}
                        </span>
                      </div>
                    ) : null}

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

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {galleryCopy.grid.modal.captured}
                      </label>
                      <input
                        type="datetime-local"
                        value={captured}
                        onChange={(e) => setCaptured(e.target.value)}
                        className={formFieldClass}
                      />
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    editCardClass,
                    editTagsCardClass,
                    "lg:col-span-2",
                  )}
                >
                  <div className="space-y-5 p-5 sm:p-6">
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
            </form>
          )}
        </div>
        </main>
      </div>
  );
}
