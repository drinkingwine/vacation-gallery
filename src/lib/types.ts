export interface TripMetadata {
  title?: string;
  kind?: "trip" | "stuff" | "event";
  /**
   * Vacation tags — dive and/or R&R. Prefer `categories`.
   * Legacy single-string `category` is still read.
   */
  categories?: Array<"dive" | "r&r">;
  /** @deprecated Use `categories` — still accepted when reading older trip.json files. */
  category?: "dive" | "r&r" | Array<"dive" | "r&r">;
  location?: string;
  geoLocation?: string;
  latitude?: number;
  longitude?: number;
  startDate?: string;
  endDate?: string;
  description?: string;
  coverPhoto?: string;
}

export interface Photo {
  name: string;
  path: string;
  sha: string;
  downloadUrl: string;
  size: number;
  mediaType?: "photo" | "video";
  trip?: string;
  caption?: string;
  tags?: string[];
  location?: string;
  latitude?: number;
  longitude?: number;
  dateTaken?: string;
  sourceTrip?: string;
  sourcePath?: string;
  width?: number;
  height?: number;
  blurHash?: string;
}

export interface Trip {
  name: string;
  path: string;
  photoCount: number;
  videoCount?: number;
  coverUrl: string | null;
  coverPhoto?: string;
  title: string;
  kind: "trip" | "stuff" | "event";
  /** Dive and/or R&R tags for vacation trips. */
  categories?: Array<"dive" | "r&r">;
  location?: string;
  geoLocation?: string;
  latitude?: number;
  longitude?: number;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export type SortField = "name" | "size";
export type SortOrder = "asc" | "desc";

export interface UploadFile {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  uploadName?: string;
}

export interface CreateTripInput {
  name: string;
  title?: string;
  kind?: "trip" | "stuff" | "event";
  categories?: Array<"dive" | "r&r">;
  location?: string;
  geoLocation?: string;
  latitude?: number;
  longitude?: number;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export type UpdateTripInput = Omit<CreateTripInput, "name">;

export type PhotoMetaEntry = {
  caption?: string;
  tags?: string[];
  location?: string;
  latitude?: number;
  longitude?: number;
  dateTaken?: string;
  sourceTrip?: string;
  sourcePath?: string;
};

export type PhotosMetadata = Record<string, PhotoMetaEntry>;

export type UpdatePhotoInput = {
  trip: string;
  path: string;
  sha: string;
  caption?: string;
  newName?: string;
  addTag?: string;
  removeTag?: string;
  tags?: string[];
  dateTaken?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type GalleryPhoto = Photo & {
  id: string;
  tripName: string;
  tripTitle: string;
  tripLocation?: string;
  tripStartDate?: string;
};

export type GallerySortOrder = "newest" | "oldest";

export type GalleryResponse = {
  items: GalleryPhoto[];
  page: number;
  hasNext: boolean;
  total: number;
};
