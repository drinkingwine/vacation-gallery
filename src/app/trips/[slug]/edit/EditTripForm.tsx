"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GeoLocator, type GeoLocatorResult } from "@/components/GeoLocator";
import { LocationPreviewMap } from "@/components/map/LocationPreviewMap";
import type { FamilyUserPublic } from "@/lib/family-users";
import { formFieldClass } from "@/lib/form-styles";
import {
  EVENT_KIND_OPTIONS,
  getEventKind,
  type EventKind,
} from "@/lib/event-kind";
import { loadGalleryHome, patchCachedGalleryTrip } from "@/lib/gallery-home-cache";
import { normalizeTripAccess } from "@/lib/trip-access";
import {
  getTripCategories,
  toggleTripCategory,
  TRIP_CATEGORY_OPTIONS,
  type TripCategory,
} from "@/lib/trip-category";
import { invalidateTripPageCache } from "@/lib/trip-page-cache";
import { toDateInputValue } from "@/lib/trip-meta";
import type { Trip } from "@/lib/types";
import { cn } from "@/lib/utils";

type EditTripFormProps = {
  trip: Trip;
};

export function EditTripForm({ trip }: EditTripFormProps) {
  const router = useRouter();
  const tripHref = `/trips/${encodeURIComponent(trip.name)}`;

  const [title, setTitle] = useState(trip.title);
  const [kind, setKind] = useState<EventKind>(getEventKind(trip));
  const [categories, setCategories] = useState<TripCategory[]>(() =>
    getTripCategories(trip),
  );
  const [location, setLocation] = useState(trip.location ?? "");
  const [geoLocation, setGeoLocation] = useState(trip.geoLocation ?? "");
  const [latitude, setLatitude] = useState<number | null>(trip.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(trip.longitude ?? null);
  const [startDate, setStartDate] = useState(toDateInputValue(trip.startDate));
  const [endDate, setEndDate] = useState(toDateInputValue(trip.endDate));
  const [description, setDescription] = useState(trip.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewLocation, setPreviewLocation] = useState<GeoLocatorResult | null>(null);
  const [familyUsers, setFamilyUsers] = useState<FamilyUserPublic[]>([]);
  const [familyUsersLoading, setFamilyUsersLoading] = useState(true);
  const [familyUsersError, setFamilyUsersError] = useState<string | null>(null);
  const [guestAccess, setGuestAccess] = useState(() => trip.access?.guest ?? true);
  const [selectedFamilyUserIds, setSelectedFamilyUserIds] = useState<string[]>(
    () => trip.access?.familyUserIds ?? [],
  );
  const [accessInitialized, setAccessInitialized] = useState(
    () => trip.access != null,
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setFamilyUsersLoading(true);
      setFamilyUsersError(null);
      try {
        const res = await fetch("/api/family-users");
        const data = (await res.json()) as {
          users?: FamilyUserPublic[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error ?? "Failed to load family users");
        }
        if (!cancelled) {
          const users = data.users ?? [];
          setFamilyUsers(users);
          if (!accessInitialized) {
            const normalized = normalizeTripAccess(
              trip.access,
              users.map((user) => user.id),
            );
            setGuestAccess(normalized.guest);
            setSelectedFamilyUserIds(normalized.familyUserIds);
            setAccessInitialized(true);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setFamilyUsersError(
            err instanceof Error ? err.message : "Failed to load family users",
          );
        }
      } finally {
        if (!cancelled) setFamilyUsersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessInitialized, trip.access]);

  const selectedLocation: GeoLocatorResult | null =
    latitude != null && longitude != null
      ? {
          location: location || formatCoords(latitude, longitude),
          geoLocation: geoLocation || location || formatCoords(latitude, longitude),
          latitude,
          longitude,
        }
      : null;

  const mapLocation = previewLocation ?? selectedLocation;

  const handleLocationSelect = (result: GeoLocatorResult) => {
    setLocation(result.location);
    setGeoLocation(result.geoLocation);
    setLatitude(result.latitude);
    setLongitude(result.longitude);
  };

  const toggleFamilyUser = (userId: string) => {
    setSelectedFamilyUserIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || saving) return;

    setSaving(true);
    setError(null);

    const access = {
      guest: guestAccess,
      familyUserIds: selectedFamilyUserIds,
    };

    try {
      const res = await fetch(`/api/trips/${encodeURIComponent(trip.name)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          kind,
          categories: kind === "trip" ? categories : [],
          location: location.trim() || undefined,
          geoLocation: geoLocation.trim() || undefined,
          latitude: latitude ?? undefined,
          longitude: longitude ?? undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          description: description.trim() || undefined,
          access,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");

      invalidateTripPageCache(trip.name);
      await loadGalleryHome({ force: true });
      patchCachedGalleryTrip(trip.name, {
        title: title.trim(),
        kind,
        categories: kind === "trip" ? categories : [],
        location: location.trim() || undefined,
        geoLocation: geoLocation.trim() || undefined,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        description: description.trim() || undefined,
        access,
      });
      router.push(tripHref);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <main className="page-container main-offset mx-auto flex-1 px-0 pb-16">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="space-y-1">
            <h1 className="font-serif text-3xl font-semibold text-zinc-900 dark:text-white">
              Edit event
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Update this album&apos;s details and type.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-end gap-2 rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <Link
                href={tripHref}
                className="rounded-xl px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving || !title.trim()}
                className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                {error}
              </div>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="space-y-4 p-5">
                  <div>
                    <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Event type
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {EVENT_KIND_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setKind(option.value)}
                          className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                            kind === option.value
                              ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                              : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {kind === "trip" ? (
                    <div>
                      <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Tags
                      </span>
                      <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
                        Select one or both.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {TRIP_CATEGORY_OPTIONS.map((option) => {
                          const active = categories.includes(option.value);
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() =>
                                setCategories((current) =>
                                  toggleTripCategory(current, option.value),
                                )
                              }
                              className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                                active
                                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                                  : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300"
                              }`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Folder name
                    </label>
                    <input
                      type="text"
                      value={trip.name}
                      readOnly
                      className={`${formFieldClass} cursor-not-allowed opacity-70`}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Display title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      autoFocus
                      className={formFieldClass}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Location
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Optional — use geo locator or type manually"
                      className={formFieldClass}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Geo location
                    </label>
                    <input
                      type="text"
                      value={geoLocation}
                      onChange={(e) => setGeoLocation(e.target.value)}
                      placeholder="Full geocoded address"
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
                        onChange={(e) => setLatitude(parseCoordInput(e.target.value))}
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
                        onChange={(e) => setLongitude(parseCoordInput(e.target.value))}
                        placeholder="e.g. -68.3725"
                        className={formFieldClass}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Start date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className={formFieldClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        End date
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className={formFieldClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Optional"
                      className={formFieldClass}
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="p-5">
                  <GeoLocator
                    onSelect={handleLocationSelect}
                    onLocated={setPreviewLocation}
                    selected={selectedLocation}
                    tripName={trip.name}
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="space-y-4 p-5">
                  <div className="space-y-1">
                    <h2 className="font-serif text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                      Who can see this
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Toggle Guest and family accounts that may browse this
                      album. Guest and family access are independent.
                    </p>
                  </div>

                  {familyUsersLoading ? (
                    <p className="text-sm text-zinc-500">Loading…</p>
                  ) : familyUsersError ? (
                    <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                      {familyUsersError}
                    </p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setGuestAccess((value) => !value)}
                        aria-pressed={guestAccess}
                        className={cn(
                          "rounded-xl border p-3 text-left transition",
                          guestAccess
                            ? "border-emerald-500 bg-emerald-500 text-white dark:border-emerald-400 dark:bg-emerald-500"
                            : "border-zinc-200 bg-zinc-50/60 text-zinc-700 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-300 dark:hover:border-zinc-600",
                        )}
                      >
                        <p className="truncate font-medium">Guest</p>
                      </button>

                      {familyUsers.map((user) => {
                        const selected = selectedFamilyUserIds.includes(user.id);
                        return (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => toggleFamilyUser(user.id)}
                            aria-pressed={selected}
                            className={cn(
                              "rounded-xl border p-3 text-left transition",
                              selected
                                ? "border-emerald-500 bg-emerald-500 text-white dark:border-emerald-400 dark:bg-emerald-500"
                                : "border-zinc-200 bg-zinc-50/60 text-zinc-700 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-300 dark:hover:border-zinc-600",
                            )}
                          >
                            <p className="truncate font-medium">
                              {user.displayName}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <LocationPreviewMap
              latitude={mapLocation?.latitude}
              longitude={mapLocation?.longitude}
              label={mapLocation?.geoLocation ?? mapLocation?.location}
            />
          </form>
        </div>
      </main>
    </>
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
