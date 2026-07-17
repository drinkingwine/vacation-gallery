"use client";

import { useMemo } from "react";
import { GallerySelectionShell } from "@/components/gallery/GallerySelectionShell";
import { LightGalleryCollectionPicker } from "@/components/gallery/LightGalleryCollectionPicker";
import { useGalleryHomeSlice } from "@/hooks/use-gallery-home-cache";
import { galleryCopy } from "@/lib/gallery-copy";
import { personGalleryPath } from "@/lib/people-gallery";

export function GalleryPeopleSelection() {
  const { value: people, loading } = useGalleryHomeSlice("people");

  const items = useMemo(
    () =>
      people.map((person) => ({
        key: person.tag,
        href: personGalleryPath(person.tag),
        title: person.label,
        coverUrl: person.coverUrl,
        count: person.photoCount,
      })),
    [people],
  );

  return (
    <GallerySelectionShell
      title="People"
      loading={loading}
      empty={!loading && people.length === 0}
      contentClassName="contents"
      emptyMessage={galleryCopy.people.empty}
    >
      <LightGalleryCollectionPicker items={items} />
    </GallerySelectionShell>
  );
}
