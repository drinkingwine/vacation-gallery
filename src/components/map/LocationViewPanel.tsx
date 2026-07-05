"use client";

import { useEffect, useRef, useState } from "react";
import { Map, useApiIsLoaded } from "@vis.gl/react-google-maps";
import { X } from "lucide-react";
import {
  googleMapsPlaceUrl,
  googleMapsStreetViewUrl,
  type MapLocationMarker,
} from "@/lib/map";
import { formatCoordinates } from "@/lib/reverse-geocode";

type LocationViewPanelProps = {
  location: MapLocationMarker;
  onClose: () => void;
};

function SatelliteFallback({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  return (
    <Map
      defaultCenter={{ lat: latitude, lng: longitude }}
      defaultZoom={18}
      mapTypeId="satellite"
      gestureHandling="greedy"
      disableDefaultUI={false}
      style={{ width: "100%", height: "100%" }}
    />
  );
}

function StreetViewPanel({
  latitude,
  longitude,
  onUnavailable,
}: {
  latitude: number;
  longitude: number;
  onUnavailable: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiLoaded = useApiIsLoaded();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!apiLoaded || !container) return;

    setLoading(true);
    let cancelled = false;

    const panorama = new google.maps.StreetViewPanorama(container, {
      position: { lat: latitude, lng: longitude },
      visible: true,
      addressControl: true,
      linksControl: true,
      panControl: true,
      fullscreenControl: true,
      motionTracking: false,
      motionTrackingControl: false,
    });

    const service = new google.maps.StreetViewService();
    service.getPanorama(
      {
        location: { lat: latitude, lng: longitude },
        radius: 150,
        source: google.maps.StreetViewSource.OUTDOOR,
      },
      (data, status) => {
        if (cancelled) return;

        if (
          status === google.maps.StreetViewStatus.OK &&
          data?.location?.latLng
        ) {
          panorama.setPano(data.location.pano as string);
          panorama.setPosition(data.location.latLng);
          setLoading(false);
          return;
        }

        onUnavailable();
      },
    );

    return () => {
      cancelled = true;
      panorama.setVisible(false);
    };
  }, [apiLoaded, latitude, longitude, onUnavailable]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="absolute inset-0" />
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 text-sm text-zinc-500">
          Loading Street View…
        </div>
      ) : null}
    </div>
  );
}

export function LocationViewPanel({ location, onClose }: LocationViewPanelProps) {
  const [streetViewAvailable, setStreetViewAvailable] = useState(true);
  const label =
    location.location ?? formatCoordinates(location.latitude, location.longitude);

  useEffect(() => {
    setStreetViewAvailable(true);
  }, [location.id]);

  return (
    <div className="absolute inset-0 z-20 flex items-end p-3 sm:items-center sm:justify-center sm:p-6">
      <button
        type="button"
        aria-label="Close location view"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <div className="relative flex max-h-[min(82dvh,720px)] w-full flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 sm:max-w-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {label}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {location.photoCount} photo
              {location.photoCount === 1 ? "" : "s"} at this location
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-200 p-1.5 text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative h-[min(56dvh,480px)] min-h-[280px] w-full bg-zinc-100 dark:bg-zinc-950">
          {streetViewAvailable ? (
            <StreetViewPanel
              latitude={location.latitude}
              longitude={location.longitude}
              onUnavailable={() => setStreetViewAvailable(false)}
            />
          ) : (
            <SatelliteFallback
              latitude={location.latitude}
              longitude={location.longitude}
            />
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3 text-xs dark:border-zinc-800">
          <span className="text-zinc-500 dark:text-zinc-400">
            {streetViewAvailable ? "Google Street View" : "Satellite view"}
          </span>
          <div className="flex flex-wrap gap-3">
            {streetViewAvailable ? (
              <a
                href={googleMapsStreetViewUrl(
                  location.latitude,
                  location.longitude,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold uppercase tracking-[0.15em] text-indigo-600 hover:text-indigo-800 dark:text-indigo-300 dark:hover:text-indigo-200"
              >
                Open Street View
              </a>
            ) : null}
            <a
              href={googleMapsPlaceUrl(location.latitude, location.longitude)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold uppercase tracking-[0.15em] text-indigo-600 hover:text-indigo-800 dark:text-indigo-300 dark:hover:text-indigo-200"
            >
              Open in Google Maps
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
