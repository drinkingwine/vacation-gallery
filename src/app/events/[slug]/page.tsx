import { notFound } from "next/navigation";
import { TripAlbumPage } from "@/components/TripAlbumPage";
import { listTrips } from "@/lib/github";
import { findEventSummary } from "@/lib/events-gallery";

export const dynamic = "force-dynamic";

type EventsPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function EventSlugPage({ params }: EventsPageProps) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug).trim().toLowerCase();
  const event = findEventSummary(await listTrips(), slug);
  if (!event) {
    notFound();
  }

  return <TripAlbumPage tripName={event.tripName} afterDeleteHref="/events" />;
}
