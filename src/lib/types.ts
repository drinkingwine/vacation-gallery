export interface TripMetadata {
  title?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface Photo {
  name: string;
  path: string;
  sha: string;
  downloadUrl: string;
  size: number;
  trip?: string;
}

export interface Trip {
  name: string;
  path: string;
  photoCount: number;
  coverUrl: string | null;
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
