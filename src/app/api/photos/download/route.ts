import { NextRequest, NextResponse } from "next/server";
import { fetchPhotoForDownload } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const path = req.nextUrl.searchParams.get("path");
    if (!path) {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }

    const { data, contentType, filename } = await fetchPhotoForDownload(path);
    const safeFilename = filename.replace(/[^\w.\-() ]+/g, "_");

    return new NextResponse(Buffer.from(data), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /photos/download]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
