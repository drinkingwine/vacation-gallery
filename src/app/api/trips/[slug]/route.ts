import { NextRequest, NextResponse } from "next/server";
import { deleteTrip, getTrip } from "@/lib/github";

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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const tripName = decodeURIComponent(slug);
    const trip = await getTrip(tripName);

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    await deleteTrip(tripName);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /trips/[slug] DELETE]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
