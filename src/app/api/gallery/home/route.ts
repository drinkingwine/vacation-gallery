import { NextResponse } from "next/server";
import { getGalleryHomeServerPayload } from "@/lib/gallery-home-server-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await getGalleryHomeServerPayload();
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /gallery/home]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
