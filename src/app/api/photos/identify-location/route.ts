import { NextRequest, NextResponse } from "next/server";
import {
  hasVisionLocationProvider,
  identifyLocationFromImage,
} from "@/lib/ai-vision-location";
import { requireAdminSession } from "@/lib/server-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasVisionLocationProvider()) {
    return NextResponse.json(
      {
        error:
          "No vision API configured. Add OPENAI_API_KEY, ANTHROPIC_API_KEY, or XAI_API_KEY to .env.local.",
      },
      { status: 503 },
    );
  }

  try {
    const body = (await req.json()) as {
      imageUrl?: string;
      tripTitle?: string | null;
      tripLocation?: string | null;
      filename?: string | null;
      preferredProvider?: "openai" | "anthropic" | "xai" | null;
    };

    const imageUrl = body.imageUrl?.trim();
    if (!imageUrl) {
      return NextResponse.json(
        { error: "imageUrl is required" },
        { status: 400 },
      );
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      return NextResponse.json({ error: "Invalid imageUrl" }, { status: 400 });
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return NextResponse.json(
        { error: "imageUrl must be http(s)" },
        { status: 400 },
      );
    }

    const result = await identifyLocationFromImage({
      imageUrl,
      tripTitle: body.tripTitle,
      tripLocation: body.tripLocation,
      filename: body.filename,
      preferredProvider: body.preferredProvider ?? null,
    });

    return NextResponse.json({
      success: true,
      provider: result.provider,
      model: result.model,
      suggestions: result.suggestions,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Location identification failed";
    console.error("[API /photos/identify-location]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
