"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GeoLocator, type GeoLocatorResult } from "@/components/GeoLocator";
import { LocationPreviewMap } from "@/components/map/LocationPreviewMap";
import { useAuth } from "@/components/AuthProvider";
import { useNavbarConfig } from "@/components/navbar-config";
import { FAVORITES_TRIP_NAME } from "@/lib/favorites-trip";
import { formFieldClass } from "@/lib/form-styles";

export function NewTripForm() {
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useAuth();

  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [geoLocation, setGeoLocation] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewLocation, setPreviewLocation] = useState<GeoLocatorResult | null>(null);

  useNavbarConfig({ backHref: "/", backLabel: "Back" });

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) router.replace("/login?from=/trips/new");
  }, [authLoading, isAdmin, router]);

  const selectedLocation: GeoLocatorResult | null =
    latitude != null && longitude != null
      ? {
          location: location || formatCoords(latitude, longitude),
          geoLocation: geoLocation || location || formatCoords(latitude, longitude),
          latitude,
          longitude,
        }
      : null;

  const mapLocation = selectedLocation ?? previewLocation;

  const handleLocationSelect = (result: GeoLocatorResult) => {
    setLocation(result.location);
    setGeoLocation(result.geoLocation);
    setLatitude(result.latitude);
    setLongitude(result.longitude);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || creating) return;
    if (name.trim() === FAVORITES_TRIP_NAME) {
      setError(`"${FAVORITES_TRIP_NAME}" is a reserved trip name`);
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/trips/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          title: title.trim() || undefined,
          location: location.trim() || undefined,
          geoLocation: geoLocation.trim() || undefined,
          latitude: latitude ?? undefined,
          longitude: longitude ?? undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          description: description.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create trip");

      router.push(`/trips/${encodeURIComponent(data.name)}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create trip");
    } finally {
      setCreating(false);
    }
  };

  if (authLoading || !isAdmin) {
    return null;
  }

  return (
    <>
      <main className="page-container main-offset mx-auto flex-1 px-0 pb-16">
        <div className="mx-auto max-w-4xl space-y-6">
          <header className="space-y-1">
            <h1 className="font-serif text-3xl font-semibold text-zinc-900 dark:text-white">
              New trip
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Create a folder for a new vacation album.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                {error}
              </div>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="space-y-4 p-5">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Folder name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. amalfi-coast-2024"
                      required
                      autoFocus
                      className={formFieldClass}
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
                      placeholder="Optional"
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
                      onChange={(e) => {
                        setLocation(e.target.value);
                        setGeoLocation("");
                        setLatitude(null);
                        setLongitude(null);
                        setPreviewLocation(null);
                      }}
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
                  />
                </div>
              </div>
            </div>

            <LocationPreviewMap
              latitude={mapLocation?.latitude}
              longitude={mapLocation?.longitude}
              label={mapLocation?.geoLocation ?? mapLocation?.location}
            />

            <div className="flex justify-end gap-2 rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <Link
                href="/"
                className="rounded-xl px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={creating || !name.trim()}
                className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
              >
                {creating ? "Creating…" : "Create trip"}
              </button>
            </div>
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
