import { NextRequest, NextResponse } from "next/server";
import {
  contentTypeForFilename,
  isMedia,
  maxUploadBytesForFilename,
  sanitizeMediaFilename,
} from "@/lib/media";
import { buildMediaKey, createPresignedUpload, getPublicUrl } from "@/lib/r2";

export const dynamic = "force-dynamic";

type PresignBody = {
  filename: string;
  trip?: string;
  contentType?: string;
  contentLength?: number;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PresignBody;
    const { filename, trip, contentType, contentLength } = body;

    if (!filename) {
      return NextResponse.json({ error: "filename is required" }, { status: 400 });
    }

    const safeName = sanitizeMediaFilename(filename);
    if (!safeName || !isMedia(safeName)) {
      return NextResponse.json(
        { error: "Only image and video files are supported" },
        { status: 400 },
      );
    }

    if (
      typeof contentLength === "number" &&
      contentLength > maxUploadBytesForFilename(safeName)
    ) {
      const maxMb = Math.round(
        maxUploadBytesForFilename(safeName) / (1024 * 1024),
      );
      return NextResponse.json(
        { error: `File too large. Maximum size is ${maxMb}MB` },
        { status: 413 },
      );
    }

    const key = buildMediaKey(trip, safeName);
    const uploadUrl = await createPresignedUpload(
      key,
      contentType?.trim() || contentTypeForFilename(safeName),
      contentLength,
    );

    return NextResponse.json({
      uploadUrl,
      key,
      path: key,
      publicUrl: getPublicUrl(key),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /upload/presign]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
