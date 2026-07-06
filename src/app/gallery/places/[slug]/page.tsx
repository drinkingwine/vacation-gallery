import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GalleryPageClient } from "@/components/gallery/GalleryPageClient";
import { GalleryPlaceContent } from "@/components/gallery/GalleryPlaceContent";
import { GallerySkeleton } from "@/components/gallery/GallerySkeleton";
import { listTrips } from "@/lib/github";
import { findPlaceSummary } from "@/lib/places-gallery";

export const dynamic = "force-dynamic";

type GalleryPlacePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    q?: string;
    media?: string;
  }>;
};

export default async function GalleryPlacePage({
  params,
  searchParams,
}: GalleryPlacePageProps) {
  const { slug: rawSlug } = await params;
  const placeSlug = decodeURIComponent(rawSlug).trim().toLowerCase();
  const query = await searchParams;
  const keyword = typeof query.q === "string" ? query.q : "";
  const place = findPlaceSummary(await listTrips(), placeSlug);

  if (!place) {
    notFound();
  }

  return (
    <GalleryPageClient>
      <main className="page-container main-offset mx-auto flex-1 px-0 pb-16">
        <Suspense fallback={<GallerySkeleton />}>
          <GalleryPlaceContent placeSlug={placeSlug} initialKeyword={keyword} />
        </Suspense>
      </main>
    </GalleryPageClient>
  );
}
