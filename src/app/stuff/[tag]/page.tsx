import { notFound } from "next/navigation";
import { TripAlbumPage } from "@/components/TripAlbumPage";
import { listTrips } from "@/lib/github";
import { findStuffSummary } from "@/lib/stuff-gallery";

export const dynamic = "force-dynamic";

type StuffPageProps = {
  params: Promise<{ tag: string }>;
};

export default async function StuffSlugPage({ params }: StuffPageProps) {
  const { tag: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug).trim().toLowerCase();
  const stuff = findStuffSummary(await listTrips(), slug);
  if (!stuff) {
    notFound();
  }

  return <TripAlbumPage tripName={stuff.tripName} afterDeleteHref="/stuff" />;
}
