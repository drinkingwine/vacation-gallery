import { NextRequest, NextResponse } from "next/server";
import { getTrip, setTripCoverPhoto } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const tripName = decodeURIComponent(slug);
    const trip = await getTrip(tripName);

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const body = await req.json();
    const clear = body?.clear === true || body?.photoName === null;
    const photoName =
      typeof body.photoName === "string" ? body.photoName.trim() : "";

    if (!clear && !photoName) {
      return NextResponse.json(
        { error: "photoName is required" },
        { status: 400 },
      );
    }

    await setTripCoverPhoto(tripName, clear ? null : photoName);
    const updated = await getTrip(tripName);

    return NextResponse.json({
      success: true,
      coverPhoto: clear ? null : photoName,
      coverUrl: updated?.coverUrl ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /trips/[slug]/cover]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
