import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GalleryPageClient } from "@/components/gallery/GalleryPageClient";
import { GalleryPlaceContent } from "@/components/gallery/GalleryPlaceContent";
import { GallerySkeleton } from "@/components/gallery/GallerySkeleton";
import { isFavoritesTrip } from "@/lib/favorites-trip";
import { getTrip } from "@/lib/github";

export const dynamic = "force-dynamic";

type GalleryPlacePageProps = {
  params: Promise<{ slug: string }>;
};

export default async function GalleryPlacePage({ params }: GalleryPlacePageProps) {
  const { slug: rawSlug } = await params;
  const tripSlug = decodeURIComponent(rawSlug);
  const trip = await getTrip(tripSlug);

  if (!trip || isFavoritesTrip(trip.name)) {
    notFound();
  }

  return (
    <GalleryPageClient>
      <main className="page-container main-offset mx-auto flex-1 px-0 pb-16">
        <Suspense fallback={<GallerySkeleton />}>
          <GalleryPlaceContent tripSlug={tripSlug} />
        </Suspense>
      </main>
    </GalleryPageClient>
  );
}
