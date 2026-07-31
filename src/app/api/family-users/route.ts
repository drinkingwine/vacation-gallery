import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server-auth";
import {
  createFamilyUser,
  listFamilyUsers,
} from "@/lib/family-users";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await listFamilyUsers();
    return NextResponse.json({ users });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list family users";
    console.error("[API /family-users GET]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const username = typeof body.username === "string" ? body.username : "";
    const password = typeof body.password === "string" ? body.password : "";
    const displayName =
      typeof body.displayName === "string" ? body.displayName : undefined;
    const imageUrl =
      typeof body.imageUrl === "string" ? body.imageUrl : undefined;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 },
      );
    }

    const user = await createFamilyUser({
      username,
      password,
      displayName,
      imageUrl,
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create family user";
    const status = /already taken|must be/i.test(message) ? 400 : 500;
    console.error("[API /family-users POST]", message);
    return NextResponse.json({ error: message }, { status });
  }
}
