import { Suspense } from "react";
import { GalleryPageClient } from "@/components/gallery/GalleryPageClient";
import { GalleryContent } from "@/components/gallery/GalleryContent";
import { GallerySkeleton } from "@/components/gallery/GallerySkeleton";

export const dynamic = "force-dynamic";

type GalleryPageProps = {
  searchParams: Promise<{
    q?: string;
    media?: string;
  }>;
};

export default async function GalleryPage({ searchParams }: GalleryPageProps) {
  const params = await searchParams;
  const keyword = typeof params.q === "string" ? params.q : "";

  return (
    <GalleryPageClient>
      <main className="mx-auto w-[88vw] max-w-none flex-1 px-0 pb-16 pt-24">
        <Suspense fallback={<GallerySkeleton />}>
          <GalleryContent initialKeyword={keyword} />
        </Suspense>
      </main>
    </GalleryPageClient>
  );
}
