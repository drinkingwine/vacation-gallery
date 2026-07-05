import { NextRequest, NextResponse } from "next/server";
import { isImage, uploadFile } from "@/lib/github";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_SIZE_MB = 25;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filename, content, trip } = body as {
      filename: string;
      content: string;
      trip?: string;
    };

    if (!filename || !content) {
      return NextResponse.json(
        { error: "filename and content are required" },
        { status: 400 },
      );
    }

    if (!isImage(filename)) {
      return NextResponse.json(
        { error: "Only image files are supported" },
        { status: 400 },
      );
    }

    const estimatedBytes = (content.length * 3) / 4;
    if (estimatedBytes > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_SIZE_MB}MB` },
        { status: 413 },
      );
    }

    const safeName = filename.replace(/[^a-zA-Z0-9.\-_ ]/g, "").trim();
    if (!safeName) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    const path = trip ? `${trip}/${safeName}` : safeName;

    await uploadFile(path, content, `Upload: ${safeName}`);

    return NextResponse.json({ success: true, path });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /upload]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
