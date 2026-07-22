import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GalleryPageClient } from "@/components/gallery/GalleryPageClient";
import { GalleryEventContent } from "@/components/gallery/GalleryEventContent";
import { listTrips } from "@/lib/github";
import { findEventSummary } from "@/lib/events-gallery";

export const dynamic = "force-dynamic";

type EventsPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    q?: string;
    media?: string;
  }>;
};

export default async function EventSlugPage({
  params,
  searchParams,
}: EventsPageProps) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug).trim().toLowerCase();
  const query = await searchParams;
  const keyword = typeof query.q === "string" ? query.q : "";

  const event = findEventSummary(await listTrips(), slug);
  if (!event) {
    notFound();
  }

  return (
    <GalleryPageClient>
      <main className="page-container main-offset mx-auto flex-1 px-0 pb-16">
        <Suspense fallback={null}>
          <GalleryEventContent slug={slug} initialKeyword={keyword} />
        </Suspense>
      </main>
    </GalleryPageClient>
  );
}
