import { NextResponse } from "next/server";
import {
  getGalleryHomeServerPayload,
  invalidateGalleryHomeServerCache,
} from "@/lib/gallery-home-server-cache";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const fresh = new URL(request.url).searchParams.get("fresh") === "1";
    if (fresh) {
      invalidateGalleryHomeServerCache();
    }
    const payload = await getGalleryHomeServerPayload();
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /gallery/home]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
