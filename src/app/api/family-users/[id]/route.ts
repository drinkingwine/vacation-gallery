import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server-auth";
import { deleteFamilyUser, updateFamilyUser } from "@/lib/family-users";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = await req.json();
    const displayName =
      typeof body.displayName === "string" ? body.displayName : undefined;
    const password =
      typeof body.password === "string" ? body.password : undefined;
    const imageUrl =
      body.imageUrl === null
        ? null
        : typeof body.imageUrl === "string"
          ? body.imageUrl
          : undefined;

    const user = await updateFamilyUser(id, {
      displayName,
      password,
      imageUrl,
    });
    return NextResponse.json({ user });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update family user";
    const status = /not found/i.test(message)
      ? 404
      : /cannot be empty|must be|Nothing to update/i.test(message)
        ? 400
        : 500;
    console.error("[API /family-users PATCH]", message);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    await deleteFamilyUser(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete family user";
    const status = /not found/i.test(message) ? 404 : 500;
    console.error("[API /family-users DELETE]", message);
    return NextResponse.json({ error: message }, { status });
  }
}
