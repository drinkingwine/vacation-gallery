"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MapPin, Sparkles, Star } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { GeoLocator, type GeoLocatorResult } from "@/components/GeoLocator";
import {
  MakeDefaultIconButton,
} from "@/components/gallery/PhotoOverlayIcons";
import { PhotoDetailsSection } from "@/components/gallery/photo-detail/PhotoDetailsSection";
import { LocationPreviewMap } from "@/components/map/LocationPreviewMap";
import { PresetTagSectionList } from "@/components/gallery/PresetTagSectionList";
import type { VisionLocationSuggestion } from "@/lib/ai-vision-location";
import { isFavoritesTrip } from "@/lib/favorites-trip";
import { GALLERY_REFRESH_EVENT, refreshGallery } from "@/lib/gallery-admin";
import { invalidateGalleryHomeCache } from "@/lib/gallery-home-cache";
import { patchCachedTripPhoto } from "@/lib/trip-page-cache";
import { formFieldClass } from "@/lib/form-styles";
import { findPhotoByName, getEditablePhotoTags, stripAutoPhotoTags } from "@/lib/gallery";
import { galleryCopy } from "@/lib/gallery-copy";
import { googleMapsPlaceUrl } from "@/lib/map";
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "@/lib/photo-timestamp";
import {
  locationsFromTripPhotos,
  mergeRecentLocations,
  readRecentLocations,
  recentLocationMatches,
  rememberRecentLocation,
  recentLocationKey,
  toGeoLocatorResult,
  type RecentLocation,
} from "@/lib/recent-locations";
import { isNullIslandCoords } from "@/lib/reverse-geocode";
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

const sectionLabelClass =
  "text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500";

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
  const [resettingLocation, setResettingLocation] = useState(false);
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [previewLocation, setPreviewLocation] =
    useState<GeoLocatorResult | null>(null);
  const [locationDirty, setLocationDirty] = useState(false);
  const [tripPhotos, setTripPhotos] = useState<Photo[]>([]);
  const [storedRecentLocations, setStoredRecentLocations] = useState<
    RecentLocation[]
  >([]);
  const [identifyingLocation, setIdentifyingLocation] = useState(false);
  const [identifyError, setIdentifyError] = useState<string | null>(null);
  const [identifyProvider, setIdentifyProvider] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<
    VisionLocationSuggestion[]
  >([]);
  const [applyingSuggestionKey, setApplyingSuggestionKey] = useState<
    string | null
  >(null);

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
      setTripPhotos(photos);
      setPhoto(match);
      setFilename(match.name);
      setCaption(match.caption ?? "");
      setCaptured(toDatetimeLocalValue(match.dateTaken));
      setTags(getEditablePhotoTags(match, tripData));
      setIsFavorite(favorited);
      setLocation(match.location?.trim() ?? "");
      setLatitude(
        typeof match.latitude === "number" && Number.isFinite(match.latitude)
          ? match.latitude
          : null,
      );
      setLongitude(
        typeof match.longitude === "number" && Number.isFinite(match.longitude)
          ? match.longitude
          : null,
      );
      setPreviewLocation(null);
      setLocationDirty(false);
      setStoredRecentLocations(readRecentLocations(tripName));
      setAiSuggestions([]);
      setIdentifyError(null);
      setIdentifyProvider(null);
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

  const selectedLocation: GeoLocatorResult | null =
    latitude != null && longitude != null
      ? {
          location: location || formatCoords(latitude, longitude),
          geoLocation: location || formatCoords(latitude, longitude),
          latitude,
          longitude,
        }
      : null;

  const mapLocation = selectedLocation ?? previewLocation;

  const recentLocations = useMemo(
    () =>
      mergeRecentLocations(
        storedRecentLocations,
        locationsFromTripPhotos(tripPhotos, trip),
      ),
    [storedRecentLocations, trip, tripPhotos],
  );

  const handleLocationSelect = (result: GeoLocatorResult) => {
    setLocation(result.location);
    setLatitude(result.latitude);
    setLongitude(result.longitude);
    setPreviewLocation(null);
    setLocationDirty(true);
    setStoredRecentLocations(rememberRecentLocation(tripName, result));
  };

  const handleRecentLocationClick = (entry: RecentLocation) => {
    handleLocationSelect(toGeoLocatorResult(entry));
  };

  const handleLocated = (result: GeoLocatorResult) => {
    setPreviewLocation(result);
    setStoredRecentLocations(rememberRecentLocation(tripName, result));
  };

  const handleIdentifyLocation = async () => {
    if (!previewUrl || isVideo || identifyingLocation) return;

    setIdentifyingLocation(true);
    setIdentifyError(null);
    setAiSuggestions([]);
    setIdentifyProvider(null);

    try {
      const response = await fetch("/api/photos/identify-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: previewUrl,
          tripTitle: trip?.title ?? tripDisplayName,
          tripLocation:
            trip?.location?.trim() || trip?.geoLocation?.trim() || null,
          filename: photo?.name ?? photoName,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        provider?: string;
        model?: string;
        suggestions?: VisionLocationSuggestion[];
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Location identification failed");
      }

      setIdentifyProvider(
        data.provider && data.model
          ? `${data.provider} · ${data.model}`
          : (data.provider ?? null),
      );
      setAiSuggestions(data.suggestions ?? []);
      if ((data.suggestions?.length ?? 0) === 0) {
        setIdentifyError("No likely location found from this image.");
      }
    } catch (err) {
      setIdentifyError(
        err instanceof Error ? err.message : "Location identification failed",
      );
    } finally {
      setIdentifyingLocation(false);
    }
  };

  const handleApplyAiSuggestion = async (
    suggestion: VisionLocationSuggestion,
  ) => {
    const key = `${suggestion.label}:${suggestion.query}`;
    setApplyingSuggestionKey(key);
    setIdentifyError(null);

    try {
      if (
        typeof suggestion.latitude === "number" &&
        typeof suggestion.longitude === "number" &&
        Number.isFinite(suggestion.latitude) &&
        Number.isFinite(suggestion.longitude)
      ) {
        handleLocationSelect({
          location: suggestion.label,
          geoLocation: suggestion.label,
          latitude: suggestion.latitude,
          longitude: suggestion.longitude,
        });
        return;
      }

      const response = await fetch(
        `/api/geocode/positionstack?query=${encodeURIComponent(suggestion.query)}&mode=place`,
      );
      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
        latitude?: number;
        longitude?: number;
        label?: string;
      };

      if (
        !response.ok ||
        !data.success ||
        typeof data.latitude !== "number" ||
        typeof data.longitude !== "number"
      ) {
        throw new Error(
          data.error || "Could not geocode that suggestion — try another.",
        );
      }

      handleLocationSelect({
        location: suggestion.label,
        geoLocation: data.label || suggestion.label,
        latitude: data.latitude,
        longitude: data.longitude,
      });
    } catch (err) {
      setIdentifyError(
        err instanceof Error ? err.message : "Failed to apply suggestion",
      );
    } finally {
      setApplyingSuggestionKey(null);
    }
  };

  const geo = useMemo(() => {
    const formLatitude =
      latitude != null && Number.isFinite(latitude) ? latitude : null;
    const formLongitude =
      longitude != null && Number.isFinite(longitude) ? longitude : null;
    const tripLatitude =
      typeof trip?.latitude === "number" && Number.isFinite(trip.latitude)
        ? trip.latitude
        : null;
    const tripLongitude =
      typeof trip?.longitude === "number" && Number.isFinite(trip.longitude)
        ? trip.longitude
        : null;

    const resolvedLatitude = formLatitude ?? tripLatitude;
    const resolvedLongitude = formLongitude ?? tripLongitude;
    const locationName =
      location.trim() ||
      photo?.location?.trim() ||
      trip?.location?.trim() ||
      trip?.geoLocation?.trim() ||
      null;
    const source: "photo" | "trip" | "label" | null =
      formLatitude != null && formLongitude != null
        ? "photo"
        : tripLatitude != null && tripLongitude != null
          ? "trip"
          : locationName
            ? "label"
            : null;
    return {
      latitude: resolvedLatitude,
      longitude: resolvedLongitude,
      locationName,
      source,
    };
  }, [latitude, location, longitude, photo?.location, trip]);

  const photoAtNullIsland = isNullIslandCoords(
    photo?.latitude,
    photo?.longitude,
  );
  const tripHasCoords =
    typeof trip?.latitude === "number" &&
    typeof trip?.longitude === "number" &&
    Number.isFinite(trip.latitude) &&
    Number.isFinite(trip.longitude) &&
    !isNullIslandCoords(trip.latitude, trip.longitude);
  const canResetToTripLocation = Boolean(
    photo && photoAtNullIsland && tripHasCoords,
  );
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

  const handleResetToTripLocation = async () => {
    if (!photo || !trip || !canResetToTripLocation || resettingLocation) return;

    setResettingLocation(true);
    setSaveError(null);

    const nextLatitude = trip.latitude!;
    const nextLongitude = trip.longitude!;
    const nextLocation =
      trip.location?.trim() || trip.geoLocation?.trim() || null;

    try {
      const res = await fetch("/api/photos/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: photo.path,
          sha: photo.sha,
          trip: tripName,
          latitude: nextLatitude,
          longitude: nextLongitude,
          location: nextLocation,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to reset location");
      }

      const patch = {
        latitude: nextLatitude,
        longitude: nextLongitude,
        location: nextLocation ?? undefined,
      };
      setPhoto((current) => (current ? { ...current, ...patch } : current));
      setLatitude(nextLatitude);
      setLongitude(nextLongitude);
      setLocation(nextLocation ?? "");
      setPreviewLocation(null);
      setLocationDirty(false);
      patchCachedTripPhoto(tripName, photo.path, patch);
      invalidateGalleryHomeCache();
      refreshGallery();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to reset location",
      );
    } finally {
      setResettingLocation(false);
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
    const initialLatitude =
      typeof photo.latitude === "number" && Number.isFinite(photo.latitude)
        ? photo.latitude
        : null;
    const initialLongitude =
      typeof photo.longitude === "number" && Number.isFinite(photo.longitude)
        ? photo.longitude
        : null;
    const initialLocation = photo.location?.trim() ?? "";
    const locationChanged =
      locationDirty ||
      latitude !== initialLatitude ||
      longitude !== initialLongitude ||
      location.trim() !== initialLocation;

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
          ...(locationChanged
            ? {
                latitude: latitude ?? null,
                longitude: longitude ?? null,
                location: location.trim() || null,
              }
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
        ...(locationChanged
          ? {
              latitude: latitude ?? undefined,
              longitude: longitude ?? undefined,
              location: location.trim() || undefined,
            }
          : {}),
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
        <div className="mx-auto max-w-7xl space-y-6">
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
              <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-1">
                  <h1 className="font-serif text-3xl font-semibold text-zinc-900 dark:text-white">
                    Edit photo
                  </h1>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {tripDisplayName}
                    {photo?.mediaType === "video" ? " · Video" : null}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={cancelHref}
                    className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={saving || !filename.trim()}
                    className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </header>

              {saveError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                  {saveError}
                </div>
              ) : null}

              <div className="grid items-start gap-6 lg:grid-cols-2">
                <div className={editPhotoCardClass}>
                  <div className="space-y-5 p-5">
                    {previewUrl ? (
                      <div className="space-y-3">
                        <div className="relative overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-950">
                          {isVideo ? (
                            <video
                              src={previewUrl}
                              controls
                              playsInline
                              className="max-h-112 w-full object-contain"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleIdentifyLocation()}
                              disabled={identifyingLocation}
                              title="Click to identify a possible location with AI"
                              className="group relative block w-full cursor-zoom-in text-left disabled:cursor-wait"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={previewUrl}
                                alt={displayTitle}
                                className="max-h-112 w-full object-contain transition group-hover:opacity-95"
                                onLoad={(event) => {
                                  const image = event.currentTarget;
                                  setWidth(image.naturalWidth);
                                  setHeight(image.naturalHeight);
                                }}
                              />
                              <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-linear-to-t from-black/55 to-transparent px-3 pb-3 pt-10 text-[11px] font-semibold uppercase tracking-[0.14em] text-white opacity-0 transition group-hover:opacity-100 group-disabled:opacity-100">
                                {identifyingLocation ? (
                                  <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Identifying…
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Identify location
                                  </>
                                )}
                              </span>
                            </button>
                          )}
                          {identifyingLocation ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                              <div className="inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-zinc-800 shadow-sm dark:bg-zinc-900/95 dark:text-zinc-100">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Asking AI…
                              </div>
                            </div>
                          ) : null}
                        </div>

                        {!isVideo ? (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Click the photo to ask AI for a possible location.
                          </p>
                        ) : null}

                        {identifyError ? (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                            {identifyError}
                          </div>
                        ) : null}

                        {aiSuggestions.length > 0 ? (
                          <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-950/50">
                            <div className="flex items-center justify-between gap-3">
                              <h3 className={sectionLabelClass}>
                                AI location guesses
                              </h3>
                              {identifyProvider ? (
                                <span className="truncate text-[10px] uppercase tracking-[0.14em] text-zinc-400">
                                  {identifyProvider}
                                </span>
                              ) : null}
                            </div>
                            <ul className="space-y-2">
                              {aiSuggestions.map((suggestion) => {
                                const key = `${suggestion.label}:${suggestion.query}`;
                                const busy = applyingSuggestionKey === key;
                                const confidencePct = Math.round(
                                  suggestion.confidence * 100,
                                );
                                return (
                                  <li
                                    key={key}
                                    className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900"
                                  >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                      <div className="min-w-0 space-y-1">
                                        <p className="font-medium text-zinc-900 dark:text-white">
                                          {suggestion.label}
                                        </p>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                          {confidencePct}% confidence
                                          {suggestion.rationale
                                            ? ` · ${suggestion.rationale}`
                                            : null}
                                        </p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void handleApplyAiSuggestion(
                                            suggestion,
                                          )
                                        }
                                        disabled={Boolean(applyingSuggestionKey)}
                                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                                      >
                                        {busy ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <MapPin className="h-3.5 w-3.5" />
                                        )}
                                        {busy ? "Applying…" : "Use"}
                                      </button>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="space-y-1">
                      <h2 className="text-xl font-semibold leading-tight text-zinc-900 dark:text-white">
                        {displayTitle}
                      </h2>
                      {canSetDefault ? (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
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

                    <div className="space-y-4 border-t border-zinc-200 pt-5 dark:border-zinc-800">
                      <h3 className={sectionLabelClass}>Details</h3>
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
                </div>

                <div className={cn(editCardClass, editTagsCardClass)}>
                  <div className="space-y-5 p-5 sm:p-6">
                    <header className="space-y-1">
                      <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                        Tags
                      </h2>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Assign people, dive buddies, and subjects.
                      </p>
                    </header>

                    {recentLocations.length > 0 ? (
                      <>
                        <section className="space-y-3">
                          <h3 className={sectionLabelClass}>Recent locations</h3>
                          <div className="flex flex-wrap gap-2">
                            {recentLocations.map((entry) => {
                              const active = recentLocationMatches(
                                entry,
                                latitude,
                                longitude,
                                location,
                              );
                              const label =
                                entry.location ||
                                entry.geoLocation ||
                                formatCoords(entry.latitude, entry.longitude);
                              return (
                                <button
                                  key={recentLocationKey(entry)}
                                  type="button"
                                  onClick={() =>
                                    handleRecentLocationClick(entry)
                                  }
                                  title={`${entry.latitude.toFixed(5)}, ${entry.longitude.toFixed(5)}`}
                                  className={cn(
                                    "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-left text-[11px] transition",
                                    active
                                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                                      : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-white dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-900",
                                  )}
                                >
                                  <MapPin className="h-3 w-3 shrink-0 opacity-70" />
                                  <span className="truncate">{label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </section>
                        <div className="border-t border-zinc-200 dark:border-zinc-800" />
                      </>
                    ) : null}

                    <section className="space-y-3">
                      <h3 className={sectionLabelClass}>Assigned</h3>
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
                      <h3 className={sectionLabelClass}>Available</h3>
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

              <div className={editCardClass}>
                <div className="grid gap-6 p-5 lg:grid-cols-2 lg:p-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                        Location
                      </h2>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Override EXIF or trip coordinates with a place lookup or
                        manual lat/lng.
                      </p>
                    </div>

                    <GeoLocator
                      onSelect={handleLocationSelect}
                      onLocated={handleLocated}
                      selected={selectedLocation}
                      tripName={tripName}
                      description="Search by place or address, then apply it to this photo."
                    />

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Location label
                      </label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => {
                          setLocation(e.target.value);
                          setLocationDirty(true);
                        }}
                        placeholder="Optional — from lookup or typed manually"
                        className={formFieldClass}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          Latitude
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={latitude ?? ""}
                          onChange={(e) => {
                            setLatitude(parseCoordInput(e.target.value));
                            setLocationDirty(true);
                          }}
                          placeholder="e.g. 18.5601"
                          className={formFieldClass}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          Longitude
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={longitude ?? ""}
                          onChange={(e) => {
                            setLongitude(parseCoordInput(e.target.value));
                            setLocationDirty(true);
                          }}
                          placeholder="e.g. -68.3725"
                          className={formFieldClass}
                        />
                      </div>
                    </div>

                    {photoAtNullIsland && !locationDirty ? (
                      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-500/30 dark:bg-amber-500/10">
                        <button
                          type="button"
                          onClick={() => void handleResetToTripLocation()}
                          disabled={
                            !canResetToTripLocation ||
                            resettingLocation ||
                            saving
                          }
                          className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                          {resettingLocation
                            ? "Resetting…"
                            : "Use trip location"}
                        </button>
                        <span className="text-xs text-amber-800 dark:text-amber-200">
                          {tripHasCoords
                            ? "This photo has invalid 0,0 GPS — replace with the trip default or look up a place."
                            : "This photo has invalid 0,0 GPS. Look up a place or set trip coordinates first."}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className={sectionLabelClass}>
                        Map
                        {geo.source === "trip" && !locationDirty ? (
                          <span className="ml-2 font-medium normal-case tracking-normal text-zinc-500">
                            (trip location)
                          </span>
                        ) : null}
                      </h3>
                      {geo.latitude != null && geo.longitude != null ? (
                        <a
                          href={googleMapsPlaceUrl(geo.latitude, geo.longitude)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 underline decoration-zinc-300 underline-offset-2 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:decoration-zinc-600 dark:hover:text-zinc-100"
                        >
                          Open map
                        </a>
                      ) : null}
                    </div>
                    <LocationPreviewMap
                      latitude={mapLocation?.latitude ?? geo.latitude}
                      longitude={mapLocation?.longitude ?? geo.longitude}
                      label={
                        mapLocation?.geoLocation ??
                        mapLocation?.location ??
                        geo.locationName
                      }
                      heightClassName="h-80 lg:h-full lg:min-h-[28rem]"
                      className="rounded-xl"
                    />
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

function formatCoords(latitude: number, longitude: number): string {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

function parseCoordInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}
