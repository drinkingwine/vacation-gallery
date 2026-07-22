import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GalleryPageClient } from "@/components/gallery/GalleryPageClient";
import { GalleryStuffContent } from "@/components/gallery/GalleryStuffContent";
import { listTrips } from "@/lib/github";
import { findStuffSummary } from "@/lib/stuff-gallery";

export const dynamic = "force-dynamic";

type StuffPageProps = {
  params: Promise<{ tag: string }>;
  searchParams: Promise<{
    q?: string;
    media?: string;
  }>;
};

export default async function StuffSlugPage({
  params,
  searchParams,
}: StuffPageProps) {
  const { tag: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug).trim().toLowerCase();
  const query = await searchParams;
  const keyword = typeof query.q === "string" ? query.q : "";

  const stuff = findStuffSummary(await listTrips(), slug);
  if (!stuff) {
    notFound();
  }

  return (
    <GalleryPageClient>
      <main className="page-container main-offset mx-auto flex-1 px-0 pb-16">
        <Suspense fallback={null}>
          <GalleryStuffContent slug={slug} initialKeyword={keyword} />
        </Suspense>
      </main>
    </GalleryPageClient>
  );
}
