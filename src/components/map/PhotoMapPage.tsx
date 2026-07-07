"use client";

import { useCallback, useEffect, useState } from "react";
import {
  APIProvider,
  AdvancedMarker,
  Map,
  Pin,
  useMap,
} from "@vis.gl/react-google-maps";
import { LocationViewPanel } from "@/components/map/LocationViewPanel";
import { cn } from "@/lib/utils";
import { GALLERY_REFRESH_EVENT } from "@/lib/gallery-admin";
import {
  getCachedMapData,
  loadMapData,
} from "@/lib/map-data-cache";
import type { MapLocationMarker } from "@/lib/map";

const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 };
const DEFAULT_ZOOM = 4;
const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const mapsMapId =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim() || "DEMO_MAP_ID";

type PhotoMapProps = {
  locations: MapLocationMarker[];
};

function FitMapBounds({ locations }: { locations: MapLocationMarker[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || locations.length === 0) return;

    if (locations.length === 1) {
      map.setCenter({
        lat: locations[0].latitude,
        lng: locations[0].longitude,
      });
      map.setZoom(14);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    for (const location of locations) {
      bounds.extend({ lat: location.latitude, lng: location.longitude });
    }
    map.fitBounds(bounds, 56);
  }, [map, locations]);

  return null;
}

function PhotoMap({ locations }: PhotoMapProps) {
  const [selected, setSelected] = useState<MapLocationMarker | null>(null);

  const handleMarkerClick = useCallback((location: MapLocationMarker) => {
    setSelected(location);
  }, []);

  const handleMapClick = useCallback(() => {
    setSelected(null);
  }, []);

  return (
    <div className="absolute inset-0">
      <Map
        defaultCenter={DEFAULT_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        mapId={mapsMapId}
        gestureHandling="greedy"
        disableDefaultUI={false}
        onClick={handleMapClick}
        style={{ width: "100%", height: "100%" }}
        mapTypeControl
        streetViewControl={false}
      >
        <FitMapBounds locations={locations} />
        {locations.map((location) => (
          <AdvancedMarker
            key={location.id}
            position={{ lat: location.latitude, lng: location.longitude }}
            title={location.location ?? `${location.photoCount} photos`}
            onClick={(event) => {
              event.stopPropagation();
              handleMarkerClick(location);
            }}
          >
            <Pin
              background="#EA580C"
              borderColor="#C2410C"
              glyphColor="#FFFFFF"
              {...(location.photoCount > 1
                ? { glyphText: String(location.photoCount) }
                : {})}
            />
          </AdvancedMarker>
        ))}
      </Map>
      {selected ? (
        <LocationViewPanel
          location={selected}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  );
}

export function PhotoMapPage() {
  const cached = getCachedMapData();
  const [locations, setLocations] = useState<MapLocationMarker[]>(
    () => cached?.locations ?? [],
  );
  const [photoCount, setPhotoCount] = useState(() => cached?.photoCount ?? 0);
  const [loading, setLoading] = useState(() => !cached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLocations(force = false) {
      if (!force && !getCachedMapData()) {
        setLoading(true);
      }
      setError(null);

      try {
        const data = await loadMapData(force ? { force: true } : undefined);
        if (!cancelled) {
          setLocations(data.locations);
          setPhotoCount(data.photoCount);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load map data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadLocations();

    const refresh = () => {
      void loadLocations(true);
    };
    window.addEventListener(GALLERY_REFRESH_EVENT, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(GALLERY_REFRESH_EVENT, refresh);
    };
  }, []);

  return (
    <div className="map-page-shell flex min-h-full flex-1 flex-col">
        <main className="page-container main-offset mx-auto flex w-full flex-1 flex-col gap-4 px-0 pb-6">
          <header className="front-fade-up space-y-2">
            <h1
              className={cn(
                "font-serif text-4xl font-semibold text-zinc-800/90 dark:text-white/85 md:text-5xl",
              )}
            >
              Map
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {loading
                ? "Loading locations…"
                : `${locations.length} unique location${locations.length === 1 ? "" : "s"} from ${photoCount} geotagged photo${photoCount === 1 ? "" : "s"}`}
            </p>
          </header>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          ) : null}

          {!mapsApiKey ? (
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-6 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">
              <p className="font-medium">Google Maps API key required</p>
              <p className="mt-2 text-amber-900/80 dark:text-amber-100/80">
                Add{" "}
                <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/50">
                  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
                </code>{" "}
                to <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/50">.env.local</code>{" "}
                and enable the Maps JavaScript API in Google Cloud Console.
              </p>
            </div>
          ) : (
            <div className="relative h-[calc(100dvh-14rem)] min-h-[480px] w-full overflow-hidden rounded-2xl border border-zinc-200/80 shadow-lg dark:border-zinc-700/80">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-900">
                  <p className="text-sm text-zinc-500">Loading map…</p>
                </div>
              ) : locations.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-100 px-6 text-center dark:bg-zinc-900">
                  <p className="text-lg text-zinc-700 dark:text-zinc-200">
                    No geotagged photos yet
                  </p>
                  <p className="max-w-md text-sm text-zinc-500 dark:text-zinc-400">
                    Upload photos from a phone or camera with GPS enabled. Location
                    is extracted automatically during upload.
                  </p>
                </div>
              ) : (
                <APIProvider apiKey={mapsApiKey}>
                  <PhotoMap locations={locations} />
                </APIProvider>
              )}
            </div>
          )}
        </main>
      </div>
  );
}
