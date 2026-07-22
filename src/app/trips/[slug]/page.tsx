"use client";

import { useParams } from "next/navigation";
import { TripAlbumPage } from "@/components/TripAlbumPage";

export default function TripPage() {
  const params = useParams();
  const tripName = decodeURIComponent(params.slug as string);
  return <TripAlbumPage tripName={tripName} afterDeleteHref="/gallery" />;
}
