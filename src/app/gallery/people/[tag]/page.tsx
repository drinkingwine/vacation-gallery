import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GalleryPageClient } from "@/components/gallery/GalleryPageClient";
import { GalleryPersonContent } from "@/components/gallery/GalleryPersonContent";
import { GallerySkeleton } from "@/components/gallery/GallerySkeleton";
import { PRESET_PHOTO_TAGS } from "@/lib/photo-tags";

export const dynamic = "force-dynamic";

type GalleryPersonPageProps = {
  params: Promise<{ tag: string }>;
};

export default async function GalleryPersonPage({ params }: GalleryPersonPageProps) {
  const { tag: rawTag } = await params;
  const tag = decodeURIComponent(rawTag).trim().toLowerCase();

  if (!PRESET_PHOTO_TAGS.includes(tag as (typeof PRESET_PHOTO_TAGS)[number])) {
    notFound();
  }

  return (
    <GalleryPageClient>
      <main className="page-container main-offset mx-auto flex-1 px-0 pb-16">
        <Suspense fallback={<GallerySkeleton />}>
          <GalleryPersonContent tag={tag} />
        </Suspense>
      </main>
    </GalleryPageClient>
  );
}
