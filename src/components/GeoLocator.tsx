"use client";

import { useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { buildGeocodeQuery } from "@/lib/geocode-address";
import { formFieldClass } from "@/lib/form-styles";
import { cn } from "@/lib/utils";

export type GeoLocatorResult = {
  location: string;
  geoLocation: string;
  latitude: number;
  longitude: number;
};

type LookupMode = "place" | "address";

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

export function GeoLocator({ onSelect, onLocated, selected, className }: GeoLocatorProps) {
  const [mode, setMode] = useState<LookupMode>("place");
  const [placeQuery, setPlaceQuery] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("United States");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeoLocatorResult | null>(null);

  const handleLookup = async () => {
    setError(null);
    setIsLoading(true);

    try {
      if (mode === "address") {
        const addressParts = { street, city, state, zip, country };
        const query = buildGeocodeQuery(addressParts);
        if (!query) {
          throw new Error("Enter at least a street, city, or postal code.");
        }

        const params = new URLSearchParams({
          mode: "address",
          street,
          city,
          state,
          zip,
          country,
        });

        const response = await fetch(`/api/geocode/positionstack?${params}`);
        const data = (await response.json()) as GeocodeApiResponse;

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Address lookup failed.");
        }

        if (typeof data.latitude !== "number" || typeof data.longitude !== "number") {
          throw new Error("No coordinates returned for this address.");
        }

        const located = {
          location: query,
          geoLocation: data.label || query,
          latitude: data.latitude,
          longitude: data.longitude,
        };
        setResult(located);
        onLocated?.(located);
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
        location: query,
        geoLocation: data.label || query,
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
          Search by place name or street address, then apply it as the trip location.
        </p>
      </div>

      <div className="flex gap-2">
        {(
          [
            { id: "place", label: "Place search" },
            { id: "address", label: "Address search" },
          ] as const
        ).map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => {
              setMode(option.id);
              setError(null);
            }}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition",
              mode === option.id
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800",
            )}
          >
            {option.label}
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
            placeholder="Excellence Punta Cana, Dominican Republic"
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
        <div className="space-y-4">
          <div>
            <label htmlFor="geo-street" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Street address
            </label>
            <input
              id="geo-street"
              type="text"
              value={street}
              onChange={(event) => setStreet(event.target.value)}
              placeholder="123 Main St"
              className={formFieldClass}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="geo-city" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                City
              </label>
              <input
                id="geo-city"
                type="text"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Austin"
                className={formFieldClass}
              />
            </div>
            <div>
              <label htmlFor="geo-country" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Country
              </label>
              <input
                id="geo-country"
                type="text"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                placeholder="United States"
                className={formFieldClass}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="geo-state" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                State / province
              </label>
              <input
                id="geo-state"
                type="text"
                value={state}
                onChange={(event) => setState(event.target.value)}
                placeholder="TX"
                className={formFieldClass}
              />
            </div>
            <div>
              <label htmlFor="geo-zip" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Postal code
              </label>
              <input
                id="geo-zip"
                type="text"
                value={zip}
                onChange={(event) => setZip(event.target.value)}
                placeholder="78701"
                className={formFieldClass}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleLookup();
                  }
                }}
              />
            </div>
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
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">Geo location</p>
              <p className="mt-1 text-zinc-900 dark:text-white">{activeResult.geoLocation}</p>
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
