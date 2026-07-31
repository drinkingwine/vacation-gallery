import { NextRequest, NextResponse } from "next/server";
import { getTrip, listPhotos } from "@/lib/github";
import { getServerSession } from "@/lib/server-auth";
import { canViewTrip } from "@/lib/trip-access";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const tripName = req.nextUrl.searchParams.get("trip") ?? "";
    if (!tripName) {
      return NextResponse.json({ error: "trip is required" }, { status: 400 });
    }

    const session = await getServerSession();
    const trip = await getTrip(tripName);
    if (!trip || !canViewTrip(trip, session)) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const photos = await listPhotos(tripName);
    return NextResponse.json(photos);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /photos]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
