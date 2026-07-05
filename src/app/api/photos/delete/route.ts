import { NextRequest, NextResponse } from "next/server";
import { deleteFile } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { path, sha } = await req.json();

    if (!path || !sha) {
      return NextResponse.json(
        { error: "path and sha are required" },
        { status: 400 },
      );
    }

    if (typeof path !== "string" || typeof sha !== "string") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await deleteFile(path, sha);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /photos/delete]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
