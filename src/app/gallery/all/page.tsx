import { Suspense } from "react";
import { GalleryPageClient } from "@/components/gallery/GalleryPageClient";
import { GalleryContent } from "@/components/gallery/GalleryContent";
import { GallerySkeleton } from "@/components/gallery/GallerySkeleton";

export const dynamic = "force-dynamic";

type GalleryArchivePageProps = {
  searchParams: Promise<{
    q?: string;
    media?: string;
  }>;
};

export default async function GalleryArchivePage({
  searchParams,
}: GalleryArchivePageProps) {
  const params = await searchParams;
  const keyword = typeof params.q === "string" ? params.q : "";

  return (
    <GalleryPageClient>
      <main className="page-container main-offset mx-auto flex-1 px-0 pb-16">
        <Suspense fallback={<GallerySkeleton />}>
          <GalleryContent initialKeyword={keyword} />
        </Suspense>
      </main>
    </GalleryPageClient>
  );
}
