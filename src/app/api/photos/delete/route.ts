import { NextRequest, NextResponse } from "next/server";
import { deletePhoto } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { path } = await req.json();

    if (!path || typeof path !== "string") {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }

    await deletePhoto(path);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /photos/delete]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
