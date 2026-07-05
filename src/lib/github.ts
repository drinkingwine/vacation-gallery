import { tripLabel } from "./trip-meta";
import type { CreateTripInput, Photo, Trip, TripMetadata } from "./types";

const GITHUB_API = "https://api.github.com";
const TRIP_META_FILE = "trip.json";

interface GHConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

interface GHItem {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: "file" | "dir" | "symlink" | "submodule";
  download_url: string | null;
  content?: string;
  encoding?: string;
}

const IMAGE_EXT = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".bmp",
  ".tiff",
  ".avif",
  ".heic",
]);

export function isImage(filename: string): boolean {
  const dot = filename.lastIndexOf(".");
  if (dot === -1) return false;
  return IMAGE_EXT.has(filename.slice(dot).toLowerCase());
}

function getConfig(): GHConfig {
  const token = process.env.GITHUB_TOKEN;
  const repoEnv = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH ?? "main";

  if (!token) throw new Error("GITHUB_TOKEN environment variable is not set");
  if (!repoEnv) throw new Error("GITHUB_REPO environment variable is not set");

  const [owner, repo] = repoEnv.split("/");
  if (!owner || !repo) {
    throw new Error('GITHUB_REPO must be in "owner/repo" format');
  }

  return { token, owner, repo, branch };
}

function ghHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

export async function listContents(path = ""): Promise<GHItem[]> {
  const { token, owner, repo, branch } = getConfig();
  const encodedPath = path
    ? `/${encodeURIComponent(path).replace(/%2F/g, "/")}`
    : "";
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents${encodedPath}?ref=${branch}`;

  const res = await fetch(url, {
    headers: ghHeaders(token),
    cache: "no-store",
  });

  if (res.status === 404) return [];
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [data];
}

async function getFileContent(path: string): Promise<string | null> {
  const { token, owner, repo, branch } = getConfig();
  const encodedPath = encodeURIComponent(path).replace(/%2F/g, "/");
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodedPath}?ref=${branch}`;

  const res = await fetch(url, {
    headers: ghHeaders(token),
    cache: "no-store",
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as GHItem;
  if (!data.content) return null;

  return Buffer.from(data.content, "base64").toString("utf-8");
}

export async function getTripMetadata(tripPath: string): Promise<TripMetadata> {
  try {
    const raw = await getFileContent(`${tripPath}/${TRIP_META_FILE}`);
    if (!raw) return {};
    return JSON.parse(raw) as TripMetadata;
  } catch {
    return {};
  }
}

export async function listPhotos(trip = ""): Promise<Photo[]> {
  const items = await listContents(trip);
  return items
    .filter(
      (item) => item.type === "file" && isImage(item.name) && item.download_url,
    )
    .map((item) => ({
      name: item.name,
      path: item.path,
      sha: item.sha,
      downloadUrl: item.download_url!,
      size: item.size,
      trip: trip || undefined,
    }));
}

function buildTrip(
  dir: GHItem,
  photos: Photo[],
  metadata: TripMetadata,
): Trip {
  return {
    name: dir.name,
    path: dir.path,
    photoCount: photos.length,
    coverUrl: photos[0]?.downloadUrl ?? null,
    title: metadata.title ?? tripLabel(dir.name),
    location: metadata.location,
    startDate: metadata.startDate,
    endDate: metadata.endDate,
    description: metadata.description,
  };
}

export async function listTrips(): Promise<Trip[]> {
  const items = await listContents("");
  const dirs = items.filter((item) => item.type === "dir");

  const trips = await Promise.allSettled(
    dirs.map(async (dir): Promise<Trip> => {
      const [photos, metadata] = await Promise.all([
        listPhotos(dir.path),
        getTripMetadata(dir.path),
      ]);
      return buildTrip(dir, photos, metadata);
    }),
  );

  return trips
    .filter((r): r is PromiseFulfilledResult<Trip> => r.status === "fulfilled")
    .map((r) => r.value)
    .sort((a, b) => {
      const aDate = a.startDate ? new Date(a.startDate).getTime() : 0;
      const bDate = b.startDate ? new Date(b.startDate).getTime() : 0;
      if (aDate !== bDate) return bDate - aDate;
      return a.title.localeCompare(b.title);
    });
}

export async function getTrip(tripName: string): Promise<Trip | null> {
  const items = await listContents("");
  const dir = items.find((item) => item.type === "dir" && item.name === tripName);
  if (!dir) return null;

  const [photos, metadata] = await Promise.all([
    listPhotos(dir.path),
    getTripMetadata(dir.path),
  ]);

  return buildTrip(dir, photos, metadata);
}

export async function uploadFile(
  path: string,
  contentBase64: string,
  message: string,
): Promise<void> {
  const { token, owner, repo, branch } = getConfig();
  const encodedPath = encodeURIComponent(path).replace(/%2F/g, "/");
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodedPath}`;

  let sha: string | undefined;
  try {
    const check = await fetch(`${url}?ref=${branch}`, {
      headers: ghHeaders(token),
    });
    if (check.ok) {
      const data = await check.json();
      sha = data.sha;
    }
  } catch {
    // File doesn't exist yet
  }

  const body: Record<string, string> = {
    message,
    content: contentBase64,
    branch,
  };
  if (sha) body.sha = sha;

  const res = await fetch(url, {
    method: "PUT",
    headers: ghHeaders(token),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed (${res.status}): ${text}`);
  }
}

function metadataPayload(input: CreateTripInput): TripMetadata {
  return {
    title: input.title ?? tripLabel(input.name),
    location: input.location,
    startDate: input.startDate,
    endDate: input.endDate,
    description: input.description,
  };
}

export async function createTrip(input: CreateTripInput): Promise<void> {
  const metadata = metadataPayload(input);
  const json = JSON.stringify(metadata, null, 2);
  const content = Buffer.from(json).toString("base64");

  await uploadFile(
    `${input.name}/${TRIP_META_FILE}`,
    content,
    `Create trip: ${input.name}`,
  );
}

export async function deleteFile(path: string, sha: string): Promise<void> {
  const { token, owner, repo, branch } = getConfig();
  const encodedPath = encodeURIComponent(path).replace(/%2F/g, "/");
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodedPath}`;

  const res = await fetch(url, {
    method: "DELETE",
    headers: ghHeaders(token),
    body: JSON.stringify({
      message: `Delete: ${path}`,
      sha,
      branch,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Delete failed (${res.status}): ${text}`);
  }
}

export async function deleteTrip(tripName: string): Promise<void> {
  const items = await listContents(tripName);
  const files = items.filter((item) => item.type === "file");

  for (const file of files) {
    await deleteFile(file.path, file.sha);
  }
}
