import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GalleryPageClient } from "@/components/gallery/GalleryPageClient";
import { GalleryPersonContent } from "@/components/gallery/GalleryPersonContent";
import { isPeoplePhotoTag } from "@/lib/photo-tags";

export const dynamic = "force-dynamic";

type PersonPageProps = {
  params: Promise<{ tag: string }>;
  searchParams: Promise<{
    q?: string;
    media?: string;
  }>;
};

export default async function PersonPage({
  params,
  searchParams,
}: PersonPageProps) {
  const { tag: rawTag } = await params;
  const tag = decodeURIComponent(rawTag).trim().toLowerCase();
  const query = await searchParams;
  const keyword = typeof query.q === "string" ? query.q : "";

  if (!isPeoplePhotoTag(tag)) {
    notFound();
  }

  return (
    <GalleryPageClient>
      <main className="page-container main-offset mx-auto flex-1 px-0 pb-16">
        <Suspense fallback={null}>
          <GalleryPersonContent tag={tag} initialKeyword={keyword} />
        </Suspense>
      </main>
    </GalleryPageClient>
  );
}
