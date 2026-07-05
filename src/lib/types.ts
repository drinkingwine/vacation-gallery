export interface TripMetadata {
  title?: string;
  location?: string;
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
  trip?: string;
  caption?: string;
  tags?: string[];
  location?: string;
  latitude?: number;
  longitude?: number;
  dateTaken?: string;
}

export interface Trip {
  name: string;
  path: string;
  photoCount: number;
  coverUrl: string | null;
  coverPhoto?: string;
  title: string;
  location?: string;
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
  location?: string;
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
