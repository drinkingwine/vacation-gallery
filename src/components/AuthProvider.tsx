"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Role } from "@/lib/auth";
import { setGalleryHomeViewerIdentity } from "@/lib/gallery-home-cache";
import { invalidateMapData } from "@/lib/map-data-cache";
import { sessionCacheIdentity } from "@/lib/trip-access";
import { invalidateTripPageCache } from "@/lib/trip-page-cache";

type AuthState = {
  loading: boolean;
  authenticated: boolean;
  role: Role | null;
  userId: string | null;
  username: string | null;
  displayName: string | null;
  imageUrl: string | null;
  isAdmin: boolean;
  isFamily: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function clearViewerCaches(): void {
  invalidateMapData();
  invalidateTripPageCache();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const lastIdentityRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session");
      if (res.ok) {
        const data = await res.json();
        setRole(data.role ?? null);
        setUserId(typeof data.userId === "string" ? data.userId : null);
        setUsername(typeof data.username === "string" ? data.username : null);
        setDisplayName(
          typeof data.displayName === "string" ? data.displayName : null,
        );
        setImageUrl(typeof data.imageUrl === "string" ? data.imageUrl : null);
      } else {
        setRole(null);
        setUserId(null);
        setUsername(null);
        setDisplayName(null);
        setImageUrl(null);
      }
    } catch {
      setRole(null);
      setUserId(null);
      setUsername(null);
      setDisplayName(null);
      setImageUrl(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (loading) return;

    const session =
      role == null
        ? null
        : {
            role,
            exp: 0,
            userId: userId ?? undefined,
            username: username ?? undefined,
          };
    const identity = sessionCacheIdentity(session);
    const previous = lastIdentityRef.current;
    lastIdentityRef.current = identity;
    setGalleryHomeViewerIdentity(identity);
    if (previous != null && previous !== identity) {
      clearViewerCaches();
    }
  }, [loading, role, userId, username]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setRole(null);
    setUserId(null);
    setUsername(null);
    setDisplayName(null);
    setImageUrl(null);
    setGalleryHomeViewerIdentity("anon");
    clearViewerCaches();
    window.location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider
      value={{
        loading,
        authenticated: role !== null,
        role,
        userId,
        username,
        displayName,
        imageUrl,
        isAdmin: role === "admin",
        isFamily: role === "family",
        refresh,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
