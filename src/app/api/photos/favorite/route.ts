import { NextRequest, NextResponse } from "next/server";
import { setPhotoFavorite } from "@/lib/favorites-trip";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { trip, path, favorite } = body as {
      trip?: string;
      path?: string;
      favorite?: boolean;
    };

    if (!trip || !path || typeof favorite !== "boolean") {
      return NextResponse.json(
        { error: "trip, path, and favorite (boolean) are required" },
        { status: 400 },
      );
    }

    await setPhotoFavorite({ trip, path, favorite });
    return NextResponse.json({ success: true, favorite });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /photos/favorite]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
