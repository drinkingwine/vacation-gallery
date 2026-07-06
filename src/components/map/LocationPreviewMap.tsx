"use client";

import { useEffect } from "react";
import {
  APIProvider,
  AdvancedMarker,
  Map,
  Pin,
  useMap,
} from "@vis.gl/react-google-maps";
import { MapPin } from "lucide-react";

const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const mapsMapId =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim() || "DEMO_MAP_ID";

type LocationPreviewMapProps = {
  latitude?: number | null;
  longitude?: number | null;
  label?: string | null;
};

function CenterOnLocation({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.setCenter({ lat: latitude, lng: longitude });
    map.setZoom(14);
  }, [map, latitude, longitude]);

  return null;
}

function LocationMap({
  latitude,
  longitude,
  label,
}: {
  latitude: number;
  longitude: number;
  label?: string | null;
}) {
  return (
    <div className="h-72 w-full overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
      <Map
        defaultCenter={{ lat: latitude, lng: longitude }}
        defaultZoom={14}
        mapId={mapsMapId}
        gestureHandling="greedy"
        disableDefaultUI={false}
        style={{ width: "100%", height: "100%" }}
        mapTypeControl
        streetViewControl={false}
      >
        <CenterOnLocation latitude={latitude} longitude={longitude} />
        <AdvancedMarker
          position={{ lat: latitude, lng: longitude }}
          title={label ?? undefined}
        >
          <Pin background="#EA580C" borderColor="#C2410C" glyphColor="#FFFFFF" />
        </AdvancedMarker>
      </Map>
    </div>
  );
}

export function LocationPreviewMap({
  latitude,
  longitude,
  label,
}: LocationPreviewMapProps) {
  const hasCoords =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  if (!hasCoords) {
    return (
      <div className="flex h-72 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 text-center dark:border-zinc-700 dark:bg-zinc-950/50">
        <MapPin className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Locate a place to preview it on the map
        </p>
      </div>
    );
  }

  if (!mapsApiKey) {
    return (
      <div className="flex h-72 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 text-center dark:border-zinc-700 dark:bg-zinc-950/50">
        <MapPin className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Set <code className="text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to preview the map
        </p>
        <p className="font-mono text-xs text-zinc-400">
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={mapsApiKey}>
      <LocationMap latitude={latitude} longitude={longitude} label={label} />
    </APIProvider>
  );
}
