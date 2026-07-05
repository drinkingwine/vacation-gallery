import { cookies } from "next/headers";
import { parseSessionToken, SESSION_COOKIE, type Session } from "@/lib/auth";

export async function getServerSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  return parseSessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function requireAdminSession(): Promise<Session | null> {
  const session = await getServerSession();
  if (!session || session.role !== "admin") return null;
  return session;
}
