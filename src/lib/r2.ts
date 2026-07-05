import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  contentTypeForFilename,
  isMedia,
  sanitizeMediaFilename,
} from "./media";

export interface R2MediaObject {
  key: string;
  name: string;
  path: string;
  sha: string;
  size: number;
  downloadUrl: string;
}

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
}

let client: S3Client | null = null;

function getConfig(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!accountId) throw new Error("R2_ACCOUNT_ID environment variable is not set");
  if (!accessKeyId) throw new Error("R2_ACCESS_KEY_ID environment variable is not set");
  if (!secretAccessKey) {
    throw new Error("R2_SECRET_ACCESS_KEY environment variable is not set");
  }
  if (!bucket) throw new Error("R2_BUCKET_NAME environment variable is not set");
  if (!publicUrl) throw new Error("R2_PUBLIC_URL environment variable is not set");

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicUrl: publicUrl.replace(/['"]/g, "").replace(/\.+$/, "").replace(/\/+$/, ""),
  };
}

function getClient(): S3Client {
  if (client) return client;
  const { accountId, accessKeyId, secretAccessKey } = getConfig();
  client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}

export function getPublicUrl(key: string): string {
  const { publicUrl } = getConfig();
  return `${publicUrl}/${encodeURI(key).replace(/%2F/g, "/")}`;
}

function normalizeEtag(etag?: string, fallback?: string): string {
  const value = (etag ?? fallback ?? "").replace(/"/g, "");
  return value || "unknown";
}

export async function listMedia(trip = ""): Promise<R2MediaObject[]> {
  const { bucket } = getConfig();
  const prefix = trip ? `${trip}/` : "";
  const objects: R2MediaObject[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await getClient().send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    for (const item of response.Contents ?? []) {
      if (!item.Key || item.Key.endsWith("/")) continue;
      const name = item.Key.slice(prefix.length);
      if (!name || name.includes("/")) continue;
      if (!isMedia(name)) continue;

      objects.push({
        key: item.Key,
        name,
        path: item.Key,
        sha: normalizeEtag(item.ETag, item.Key),
        size: item.Size ?? 0,
        downloadUrl: getPublicUrl(item.Key),
      });
    }

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return objects;
}

export async function createPresignedUpload(
  key: string,
  contentType: string,
  contentLength?: number,
): Promise<string> {
  const { bucket } = getConfig();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    ...(typeof contentLength === "number" ? { ContentLength: contentLength } : {}),
  });
  return getSignedUrl(getClient(), command, { expiresIn: 3600 });
}

export async function headMedia(key: string) {
  const { bucket } = getConfig();
  return getClient().send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
}

export async function deleteMedia(key: string): Promise<void> {
  const { bucket } = getConfig();
  await getClient().send(
    new DeleteObjectCommand({ Bucket: bucket, Key: key }),
  );
}

export async function deleteMediaPrefix(prefix: string): Promise<void> {
  const { bucket } = getConfig();
  const normalized = prefix.endsWith("/") ? prefix : `${prefix}/`;
  let continuationToken: string | undefined;

  do {
    const response = await getClient().send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: normalized,
        ContinuationToken: continuationToken,
      }),
    );

    const keys = (response.Contents ?? [])
      .map((item) => item.Key)
      .filter((key): key is string => Boolean(key));

    if (keys.length > 0) {
      await getClient().send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: keys.map((Key) => ({ Key })) },
        }),
      );
    }

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);
}

export async function copyMedia(sourceKey: string, destKey: string): Promise<void> {
  const { bucket } = getConfig();
  const encodedSource = `${bucket}/${sourceKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
  await getClient().send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: encodedSource,
      Key: destKey,
      ContentType: contentTypeForFilename(destKey.split("/").pop() ?? destKey),
    }),
  );
}

export async function renameMedia(
  oldKey: string,
  newFilename: string,
): Promise<string> {
  const safeName = sanitizeMediaFilename(newFilename);
  if (!safeName || !isMedia(safeName)) {
    throw new Error("Invalid media filename");
  }

  const parts = oldKey.split("/");
  parts[parts.length - 1] = safeName;
  const newKey = parts.join("/");

  if (newKey === oldKey) return oldKey;

  await copyMedia(oldKey, newKey);
  await deleteMedia(oldKey);
  return newKey;
}

export async function fetchMediaForDownload(key: string) {
  const { bucket } = getConfig();
  const response = await getClient().send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );

  if (!response.Body) {
    throw new Error("Media file has no content");
  }

  const filename = key.split("/").pop() ?? "download";
  const bytes = await response.Body.transformToByteArray();

  return {
    data: bytes,
    contentType: response.ContentType ?? contentTypeForFilename(filename),
    filename,
  };
}

export function buildMediaKey(trip: string | undefined, filename: string): string {
  const safeName = sanitizeMediaFilename(filename);
  if (!safeName) throw new Error("Invalid filename");
  return trip ? `${trip}/${safeName}` : safeName;
}
