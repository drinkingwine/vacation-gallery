"use client";

import { useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { formFieldClass } from "@/lib/form-styles";
import { formatCoordinates } from "@/lib/reverse-geocode";
import { cn } from "@/lib/utils";

export type GeoLocatorResult = {
  label: string;
  latitude: number;
  longitude: number;
};

type LookupMode = "place" | "coordinates";

type GeocodeApiResponse = {
  success: boolean;
  latitude?: number;
  longitude?: number;
  label?: string;
  error?: string;
};

type GeoLocatorProps = {
  onSelect: (result: GeoLocatorResult) => void;
  onLocated?: (result: GeoLocatorResult) => void;
  selected?: GeoLocatorResult | null;
  className?: string;
};

function parseCoordinatePair(latRaw: string, lngRaw: string): GeoLocatorResult | null {
  const latitude = Number(latRaw.trim());
  const longitude = Number(lngRaw.trim());
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return {
    label: formatCoordinates(latitude, longitude),
    latitude,
    longitude,
  };
}

export function GeoLocator({ onSelect, onLocated, selected, className }: GeoLocatorProps) {
  const [mode, setMode] = useState<LookupMode>("place");
  const [placeQuery, setPlaceQuery] = useState("");
  const [latitudeInput, setLatitudeInput] = useState("");
  const [longitudeInput, setLongitudeInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeoLocatorResult | null>(null);

  const handleLookup = async () => {
    setError(null);
    setIsLoading(true);

    try {
      if (mode === "coordinates") {
        const parsed = parseCoordinatePair(latitudeInput, longitudeInput);
        if (!parsed) {
          throw new Error("Enter valid latitude (-90 to 90) and longitude (-180 to 180).");
        }
        setResult(parsed);
        onLocated?.(parsed);
        return;
      }

      const query = placeQuery.trim();
      if (!query) {
        throw new Error("Enter a place, city, or address to look up.");
      }

      const response = await fetch(
        `/api/geocode/positionstack?query=${encodeURIComponent(query)}&mode=place`,
      );
      const data = (await response.json()) as GeocodeApiResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Geocoding failed.");
      }

      if (typeof data.latitude !== "number" || typeof data.longitude !== "number") {
        throw new Error("No coordinates returned for this location.");
      }

      const located = {
        label: data.label || query,
        latitude: data.latitude,
        longitude: data.longitude,
      };
      setResult(located);
      onLocated?.(located);
    } catch (lookupError) {
      setResult(null);
      setError(lookupError instanceof Error ? lookupError.message : "Lookup failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const activeResult = selected ?? result;

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <h3 className="text-sm font-medium text-zinc-900 dark:text-white">Geo locator</h3>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Search for a place or enter coordinates, then apply it as the trip location.
        </p>
      </div>

      <div className="flex gap-2">
        {(["place", "coordinates"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              setMode(option);
              setError(null);
            }}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition",
              mode === option
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800",
            )}
          >
            {option === "place" ? "Place search" : "Coordinates"}
          </button>
        ))}
      </div>

      {mode === "place" ? (
        <div>
          <label htmlFor="geo-place" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Place or address
          </label>
          <input
            id="geo-place"
            type="text"
            value={placeQuery}
            onChange={(event) => setPlaceQuery(event.target.value)}
            placeholder="Amalfi Coast, Italy"
            className={formFieldClass}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleLookup();
              }
            }}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="geo-latitude" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Latitude
            </label>
            <input
              id="geo-latitude"
              type="text"
              inputMode="decimal"
              value={latitudeInput}
              onChange={(event) => setLatitudeInput(event.target.value)}
              placeholder="40.633984"
              className={formFieldClass}
            />
          </div>
          <div>
            <label htmlFor="geo-longitude" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Longitude
            </label>
            <input
              id="geo-longitude"
              type="text"
              inputMode="decimal"
              value={longitudeInput}
              onChange={(event) => setLongitudeInput(event.target.value)}
              placeholder="14.602850"
              className={formFieldClass}
            />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => void handleLookup()}
        disabled={isLoading}
        className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Looking up…
          </>
        ) : (
          <>
            <MapPin className="h-4 w-4" />
            Locate
          </>
        )}
      </button>

      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      {activeResult ? (
        <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-950/50">
          <div className="space-y-2 text-sm">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">Label</p>
              <p className="mt-1 text-zinc-900 dark:text-white">{activeResult.label}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">Latitude</p>
                <p className="mt-1 font-mono text-xs tabular-nums text-zinc-700 dark:text-zinc-200">
                  {activeResult.latitude.toFixed(6)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">Longitude</p>
                <p className="mt-1 font-mono text-xs tabular-nums text-zinc-700 dark:text-zinc-200">
                  {activeResult.longitude.toFixed(6)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {result ? (
              <button
                type="button"
                onClick={() => onSelect(result)}
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
              >
                Use this location
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
