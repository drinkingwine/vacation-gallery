import { NextResponse } from "next/server";
import { buildStuffGalleryList } from "@/lib/stuff-gallery";
import { listTrips } from "@/lib/github";
import { getServerSession } from "@/lib/server-auth";
import { filterTripsForSession } from "@/lib/trip-access";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession();
    const trips = filterTripsForSession(await listTrips(), session);
    const stuff = buildStuffGalleryList(trips);
    return NextResponse.json({ stuff });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /stuff]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
