"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();
  const [mode, setMode] = useState<"choose" | "admin">("choose");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const redirectTo = searchParams.get("from") || "/";

  const handleGuest = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "guest" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Login failed");
      }
      await refresh();
      router.replace(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "admin", username, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Login failed");
      }
      await refresh();
      router.replace(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-terracotta">
            Vacation Photos
          </p>
          <h1 className="font-display mt-3 text-4xl tracking-tight text-stone-900">
            Welcome
          </h1>
          <p className="mt-3 text-stone-600">
            Browse as a guest or sign in as admin to upload.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {mode === "choose" ? (
          <div className="mt-8 space-y-3">
            <button
              type="button"
              onClick={handleGuest}
              disabled={loading}
              className="w-full rounded-2xl border border-stone-200 bg-white px-6 py-5 text-left shadow-sm transition-all hover:border-terracotta/40 hover:shadow-md disabled:opacity-60"
            >
              <p className="font-medium text-stone-900">Continue as guest</p>
              <p className="mt-1 text-sm text-stone-500">
                Browse trips and photos
              </p>
            </button>

            <button
              type="button"
              onClick={() => setMode("admin")}
              disabled={loading}
              className="w-full rounded-2xl border border-stone-200 bg-white px-6 py-5 text-left shadow-sm transition-all hover:border-terracotta/40 hover:shadow-md disabled:opacity-60"
            >
              <p className="font-medium text-stone-900">Admin sign in</p>
              <p className="mt-1 text-sm text-stone-500">
                Upload and manage photos
              </p>
            </button>
          </div>
        ) : (
          <form onSubmit={handleAdmin} className="mt-8 space-y-4">
            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block text-sm font-medium text-stone-700"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-terracotta/40"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-stone-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-terracotta/40"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode("choose");
                  setError(null);
                }}
                className="flex-1 rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || !username || !password}
                className="flex-1 rounded-xl bg-terracotta px-4 py-2.5 text-sm font-medium text-white hover:bg-terracotta/90 disabled:opacity-50"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full flex-1 items-center justify-center text-stone-500">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
