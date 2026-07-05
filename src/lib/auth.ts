export type Role = "guest" | "admin";

export interface Session {
  role: Role;
  exp: number;
}

export const SESSION_COOKIE = "vc_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is not set");
  }
  return secret;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacSign(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return toBase64Url(new Uint8Array(sig));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(role: Role): Promise<string> {
  const payload: Session = {
    role,
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  };
  const encoded = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await hmacSign(encoded, getSecret());
  return `${encoded}.${signature}`;
}

export async function parseSessionToken(
  token: string | undefined,
): Promise<Session | null> {
  if (!token) return null;

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  try {
    const expected = await hmacSign(encoded, getSecret());
    if (!timingSafeEqual(expected, signature)) return null;

    const session = JSON.parse(
      new TextDecoder().decode(fromBase64Url(encoded)),
    ) as Session;

    if (!session.role || !session.exp || session.exp < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export function verifyAdminCredentials(
  username: string,
  password: string,
): boolean {
  const adminUser = process.env.ADMIN_USERNAME;
  const adminPass = process.env.ADMIN_PASSWORD;
  if (!adminUser || !adminPass) return false;

  const userOk =
    username.length === adminUser.length &&
    timingSafeEqual(username, adminUser);
  const passOk =
    password.length === adminPass.length &&
    timingSafeEqual(password, adminPass);

  return userOk && passOk;
}

export function isAdminRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/api/upload") ||
    pathname.startsWith("/api/trips/create")
  );
}
