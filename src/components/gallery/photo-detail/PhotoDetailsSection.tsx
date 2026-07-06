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
}: PhotoDetailsSectionProps) {
  const resolution = formatPhotoResolution(width, height);

  return (
    <section className={className}>
      <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
        {galleryCopy.grid.modal.details}
      </h3>
      <div className="mt-3 space-y-2.5">
        {tripName ? (
          <Row label={galleryCopy.grid.modal.trip} value={tripName} />
        ) : null}
        {locationName ? (
          <Row
            label={galleryCopy.grid.modal.location}
            icon="location"
            value={
              latitude != null && longitude != null ? (
                <a
                  href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-right underline decoration-zinc-300 underline-offset-2 transition-colors hover:text-indigo-600 dark:decoration-zinc-600 dark:hover:text-indigo-300"
                >
                  {locationName}
                </a>
              ) : (
                locationName
              )
            }
          />
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
      <div className="flex items-center space-x-2 text-gray-400">
        {icon === "captured" ? (
          <Calendar className="h-3.5 w-3.5" />
        ) : null}
        {icon === "location" ? <MapPin className="h-3.5 w-3.5" /> : null}
        <span>{label}</span>
      </div>
      <span className="max-w-[55%] text-right font-semibold text-gray-900 dark:text-gray-100">
        {value}
      </span>
    </div>
  );
}
