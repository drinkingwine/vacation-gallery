import { NextResponse } from "next/server";
import { listTrips } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const trips = await listTrips();
    return NextResponse.json(trips);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[API /trips]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
