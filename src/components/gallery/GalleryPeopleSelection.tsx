"use client";

import { GallerySelectionShell } from "@/components/gallery/GallerySelectionShell";
import { PersonCard } from "@/components/gallery/PersonCard";
import { useGalleryHomeSlice } from "@/hooks/use-gallery-home-cache";
import { galleryCopy } from "@/lib/gallery-copy";

export function GalleryPeopleSelection() {
  const { value: people, loading } = useGalleryHomeSlice("people");

  return (
    <GallerySelectionShell
      title="People"
      description={galleryCopy.people.description}
      count={people.length}
      countLabel={people.length === 1 ? "person" : "people"}
      loading={loading}
      empty={!loading && people.length === 0}
      emptyMessage={galleryCopy.people.empty}
    >
      {people.map((person, index) => (
        <PersonCard
          key={person.tag}
          person={person}
          priority={index < 6}
          index={index}
        />
      ))}
    </GallerySelectionShell>
  );
}
