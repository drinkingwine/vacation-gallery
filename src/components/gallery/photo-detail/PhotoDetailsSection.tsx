import { Calendar, MapPin } from "lucide-react";
import { galleryCopy } from "@/lib/gallery-copy";
import {
  formatPhotoDate,
  formatPhotoFileSize,
  formatPhotoResolution,
} from "@/lib/photo-details";

type PhotoDetailsSectionProps = {
  tripName?: string | null;
  locationName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  width?: number | null;
  height?: number | null;
  size?: number | null;
  dateShot?: string | null;
  className?: string;
  /** Always show a location row, even when no place/GPS is available. */
  showEmptyLocation?: boolean;
  locationSource?: "photo" | "trip" | "label" | null;
};

export function PhotoDetailsSection({
  tripName,
  locationName,
  latitude,
  longitude,
  width,
  height,
  size,
  dateShot,
  className,
  showEmptyLocation = false,
  locationSource = null,
}: PhotoDetailsSectionProps) {
  const resolution = formatPhotoResolution(width, height);
  const hasCoords =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);
  const locationLabel =
    locationName ||
    (hasCoords
      ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
      : showEmptyLocation
        ? "No location recorded"
        : null);
  const locationHint =
    locationSource === "trip"
      ? "Trip"
      : locationSource === "photo"
        ? "Photo GPS"
        : null;

  return (
    <section className={className}>
      <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-stone-400">
        {galleryCopy.grid.modal.details}
      </h3>
      <div className="mt-3 space-y-2.5">
        {tripName ? (
          <Row label={galleryCopy.grid.modal.trip} value={tripName} />
        ) : null}
        {locationLabel ? (
          <Row
            label={galleryCopy.grid.modal.location}
            icon="location"
            value={
              hasCoords ? (
                <a
                  href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-right underline decoration-stone-300 underline-offset-2 transition-colors hover:text-amber-800 dark:decoration-stone-600 dark:hover:text-amber-200"
                >
                  {locationLabel}
                  {locationHint ? (
                    <span className="mt-0.5 block text-[10px] font-medium normal-case tracking-normal text-stone-400 no-underline">
                      {locationHint}
                    </span>
                  ) : null}
                </a>
              ) : (
                locationLabel
              )
            }
          />
        ) : null}
        {hasCoords ? (
          <>
            <Row
              label="Latitude"
              value={
                <span className="font-mono text-[11px] tracking-tight">
                  {latitude.toFixed(6)}
                </span>
              }
            />
            <Row
              label="Longitude"
              value={
                <span className="font-mono text-[11px] tracking-tight">
                  {longitude.toFixed(6)}
                </span>
              }
            />
          </>
        ) : showEmptyLocation ? (
          <Row label="GPS" value="No coordinates" />
        ) : null}
        <Row label="Resolution" value={resolution ?? "-"} />
        <Row
          label={galleryCopy.grid.modal.size}
          value={formatPhotoFileSize(size) ?? "-"}
        />
        <Row
          label={galleryCopy.grid.modal.captured}
          icon="captured"
          value={formatPhotoDate(dateShot) ?? "-"}
        />
      </div>
    </section>
  );
}

function Row({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: "location" | "captured";
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-[12px]">
      <div className="flex items-center space-x-2 text-stone-400">
        {icon === "captured" ? (
          <Calendar className="h-3.5 w-3.5" />
        ) : null}
        {icon === "location" ? <MapPin className="h-3.5 w-3.5" /> : null}
        <span>{label}</span>
      </div>
      <span className="max-w-[55%] text-right font-semibold text-stone-800 dark:text-stone-100">
        {value}
      </span>
    </div>
  );
}
