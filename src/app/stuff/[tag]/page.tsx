import { notFound } from "next/navigation";
import { TripAlbumPage } from "@/components/TripAlbumPage";
import { listTrips } from "@/lib/github";
import { findStuffSummary } from "@/lib/stuff-gallery";
import { getServerSession } from "@/lib/server-auth";
import { filterTripsForSession } from "@/lib/trip-access";

export const dynamic = "force-dynamic";

type StuffPageProps = {
  params: Promise<{ tag: string }>;
};

export default async function StuffSlugPage({ params }: StuffPageProps) {
  const { tag: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug).trim().toLowerCase();
  const session = await getServerSession();
  const stuff = findStuffSummary(
    filterTripsForSession(await listTrips(), session),
    slug,
  );
  if (!stuff) {
    notFound();
  }

  return <TripAlbumPage tripName={stuff.tripName} afterDeleteHref="/stuff" />;
}
