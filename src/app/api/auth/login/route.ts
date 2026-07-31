import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  verifyAdminCredentials,
} from "@/lib/auth";
import { verifyFamilyCredentials } from "@/lib/family-users";

export const dynamic = "force-dynamic";

function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mode = body.mode as string;

    if (mode === "guest") {
      const token = await createSessionToken("guest");
      const response = NextResponse.json({ role: "guest" });
      setSessionCookie(response, token);
      return response;
    }

    if (mode === "family") {
      const username = typeof body.username === "string" ? body.username : "";
      const password = typeof body.password === "string" ? body.password : "";

      const user = await verifyFamilyCredentials(username, password);
      if (!user) {
        return NextResponse.json(
          { error: "Invalid username or password" },
          { status: 401 },
        );
      }

      const token = await createSessionToken("family", {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        imageUrl: user.imageUrl,
      });
      const response = NextResponse.json({
        role: "family",
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        imageUrl: user.imageUrl ?? null,
      });
      setSessionCookie(response, token);
      return response;
    }

    if (mode === "admin") {
      const username = typeof body.username === "string" ? body.username : "";
      const password = typeof body.password === "string" ? body.password : "";

      if (!verifyAdminCredentials(username, password)) {
        return NextResponse.json(
          { error: "Invalid username or password" },
          { status: 401 },
        );
      }

      const token = await createSessionToken("admin", {
        username: username.trim(),
        displayName: "Admin",
      });
      const response = NextResponse.json({
        role: "admin",
        username: username.trim(),
        displayName: "Admin",
      });
      setSessionCookie(response, token);
      return response;
    }

    return NextResponse.json({ error: "Invalid login mode" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
