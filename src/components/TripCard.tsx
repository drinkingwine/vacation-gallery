import Image from "next/image";
import Link from "next/link";
import { formatDateRange } from "@/lib/trip-meta";
import type { Trip } from "@/lib/types";

type TripCardProps = {
  trip: Trip;
};

export function TripCard({ trip }: TripCardProps) {
  const dates = formatDateRange(trip.startDate, trip.endDate);

  return (
    <Link
      href={`/trips/${encodeURIComponent(trip.name)}`}
      className="group block overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:ring-stone-300/80"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
        {trip.coverUrl ? (
          <Image
            src={trip.coverUrl}
            alt={trip.title}
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-stone-300">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 3H3a2 2 0 00-2 2v14a2 2 0 002 2h18a2 2 0 002-2V5a2 2 0 00-2-2zm0 16H3V5h18v14zm-5-7l-3 3.72L10 13l-4 5h12l-3-3z" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
          {trip.location && (
            <p className="text-sm font-medium text-white/80">{trip.location}</p>
          )}
          <h2 className="font-display text-2xl tracking-tight">{trip.title}</h2>
        </div>
      </div>

      <div className="flex items-center justify-between px-5 py-4">
        <p className="text-sm text-stone-500">{dates ?? "Trip album"}</p>
        <p className="text-sm font-medium text-terracotta">
          {trip.photoCount} photo{trip.photoCount !== 1 ? "s" : ""}
        </p>
      </div>
    </Link>
  );
}
