import { NextRequest, NextResponse } from "next/server";
import { updatePhoto } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { path, sha, trip, caption, newName, addTag, removeTag } = body as {
      path?: string;
      sha?: string;
      trip?: string;
      caption?: string;
      newName?: string;
      addTag?: string;
      removeTag?: string;
    };

    if (!path || !sha || !trip) {
      return NextResponse.json(
        { error: "path, sha, and trip are required" },
        { status: 400 },
      );
    }

    await updatePhoto({
      path,
      sha,
      trip,
      caption: typeof caption === "string" ? caption : undefined,
      newName: typeof newName === "string" ? newName : undefined,
      addTag: typeof addTag === "string" ? addTag : undefined,
      removeTag: typeof removeTag === "string" ? removeTag : undefined,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /photos/update]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
