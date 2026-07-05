import { NextRequest, NextResponse } from "next/server";
import { getTrip } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const trip = await getTrip(decodeURIComponent(slug));

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    return NextResponse.json(trip);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /trips/[slug]]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
