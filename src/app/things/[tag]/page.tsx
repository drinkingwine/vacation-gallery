import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GalleryPageClient } from "@/components/gallery/GalleryPageClient";
import { GalleryThingContent } from "@/components/gallery/GalleryThingContent";
import { GallerySkeleton } from "@/components/gallery/GallerySkeleton";
import { isThingPhotoTag } from "@/lib/photo-tags";

export const dynamic = "force-dynamic";

type ThingPageProps = {
  params: Promise<{ tag: string }>;
  searchParams: Promise<{
    q?: string;
    media?: string;
  }>;
};

export default async function ThingPage({
  params,
  searchParams,
}: ThingPageProps) {
  const { tag: rawTag } = await params;
  const tag = decodeURIComponent(rawTag).trim().toLowerCase();
  const query = await searchParams;
  const keyword = typeof query.q === "string" ? query.q : "";

  if (!isThingPhotoTag(tag)) {
    notFound();
  }

  return (
    <GalleryPageClient>
      <main className="page-container main-offset mx-auto flex-1 px-0 pb-16">
        <Suspense fallback={<GallerySkeleton />}>
          <GalleryThingContent tag={tag} initialKeyword={keyword} />
        </Suspense>
      </main>
    </GalleryPageClient>
  );
}
