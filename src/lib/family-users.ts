import { timingSafeEqual } from "@/lib/auth";
import {
  createFamilyUserRecord,
  deleteFamilyUserRecord,
  listFamilyUserRecords,
  updateFamilyUserRecord,
  type FamilyUserRecord,
} from "@/lib/github";
import { grantFamilyUserAccessToAllTrips } from "@/lib/trip-access";

const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

export type FamilyUserPublic = {
  id: string;
  username: string;
  displayName: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateFamilyUserInput = {
  username: string;
  displayName?: string;
  password: string;
  imageUrl?: string;
};

export type UpdateFamilyUserInput = {
  displayName?: string;
  password?: string;
  imageUrl?: string | null;
};

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

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function validateUsername(username: string): string {
  const normalized = normalizeUsername(username);
  if (!/^[a-z0-9][a-z0-9._-]{1,31}$/.test(normalized)) {
    throw new Error(
      "Username must be 2–32 characters: letters, numbers, . _ -",
    );
  }
  return normalized;
}

function validatePassword(password: string): void {
  if (!password) {
    throw new Error("Password is required.");
  }
}

async function hashPassword(
  password: string,
  saltBytes?: Uint8Array,
): Promise<{ passwordHash: string; passwordSalt: string }> {
  const salt = new Uint8Array(SALT_BYTES);
  if (saltBytes && saltBytes.length === SALT_BYTES) {
    salt.set(saltBytes);
  } else {
    crypto.getRandomValues(salt);
  }
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations: PBKDF2_ITERATIONS,
    },
    keyMaterial,
    HASH_BITS,
  );
  return {
    passwordHash: toBase64Url(new Uint8Array(derived)),
    passwordSalt: toBase64Url(salt),
  };
}

async function passwordMatches(
  password: string,
  user: FamilyUserRecord,
): Promise<boolean> {
  const salt = fromBase64Url(user.passwordSalt);
  const { passwordHash } = await hashPassword(password, salt);
  return timingSafeEqual(passwordHash, user.passwordHash);
}

function toPublic(user: FamilyUserRecord): FamilyUserPublic {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    ...(user.imageUrl ? { imageUrl: user.imageUrl } : {}),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function createId(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `fam_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function listFamilyUsers(): Promise<FamilyUserPublic[]> {
  const users = await listFamilyUserRecords();
  return users
    .map(toPublic)
    .sort((a, b) => a.username.localeCompare(b.username));
}

export async function createFamilyUser(
  input: CreateFamilyUserInput,
): Promise<FamilyUserPublic> {
  const username = validateUsername(input.username);
  validatePassword(input.password);

  const displayName =
    input.displayName?.trim() ||
    username.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const existing = await listFamilyUserRecords();
  if (existing.some((user) => user.username === username)) {
    throw new Error("That username is already taken.");
  }

  const now = new Date().toISOString();
  const { passwordHash, passwordSalt } = await hashPassword(input.password);
  const record: FamilyUserRecord = {
    id: createId(),
    username,
    displayName,
    passwordHash,
    passwordSalt,
    ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
    createdAt: now,
    updatedAt: now,
  };

  await createFamilyUserRecord(record);
  try {
    await grantFamilyUserAccessToAllTrips(record.id);
  } catch (err) {
    console.error(
      "[createFamilyUser] failed to grant trip access",
      err instanceof Error ? err.message : err,
    );
  }
  return toPublic(record);
}

export async function updateFamilyUser(
  id: string,
  input: UpdateFamilyUserInput,
): Promise<FamilyUserPublic> {
  if (!id.trim()) throw new Error("User id is required.");

  const patch: Partial<FamilyUserRecord> = {
    updatedAt: new Date().toISOString(),
  };

  if (typeof input.displayName === "string") {
    const displayName = input.displayName.trim();
    if (!displayName) throw new Error("Display name cannot be empty.");
    patch.displayName = displayName;
  }

  if (typeof input.password === "string" && input.password.length > 0) {
    validatePassword(input.password);
    const hashed = await hashPassword(input.password);
    patch.passwordHash = hashed.passwordHash;
    patch.passwordSalt = hashed.passwordSalt;
  }

  if (input.imageUrl === null) {
    patch.imageUrl = undefined;
  } else if (typeof input.imageUrl === "string" && input.imageUrl.trim()) {
    patch.imageUrl = input.imageUrl.trim();
  }

  const clearingImage = input.imageUrl === null;
  const hasPatch =
    patch.displayName !== undefined ||
    patch.passwordHash !== undefined ||
    (typeof patch.imageUrl === "string" && patch.imageUrl.length > 0) ||
    clearingImage;

  if (!hasPatch) {
    throw new Error("Nothing to update.");
  }

  const updated = await updateFamilyUserRecord(id, patch, {
    clearImageUrl: clearingImage,
  });
  if (!updated) throw new Error("Family user not found.");
  return toPublic(updated);
}

export async function deleteFamilyUser(id: string): Promise<void> {
  if (!id.trim()) throw new Error("User id is required.");
  const deleted = await deleteFamilyUserRecord(id);
  if (!deleted) throw new Error("Family user not found.");
}

export async function verifyFamilyCredentials(
  username: string,
  password: string,
): Promise<FamilyUserPublic | null> {
  const normalized = normalizeUsername(username);
  if (!normalized || !password) return null;

  const users = await listFamilyUserRecords();
  const user = users.find((entry) => entry.username === normalized);
  if (!user) return null;

  const ok = await passwordMatches(password, user);
  return ok ? toPublic(user) : null;
}
