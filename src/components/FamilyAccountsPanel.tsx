"use client";

import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useConfirm } from "@/components/ConfirmProvider";
import type { FamilyUserPublic } from "@/lib/family-users";
import { contentTypeForFilename, isImage } from "@/lib/media";
import { cn } from "@/lib/utils";

type Notice = { type: "success" | "error"; message: string };

const FAMILY_AVATAR_TRIP = "_family-avatars";

async function uploadAvatarFile(file: File, userId: string): Promise<string> {
  if (!isImage(file.name)) {
    throw new Error("Only image files are supported.");
  }

  const ext = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf("."))
    : ".jpg";
  const filename = `${userId}${ext}`;
  const contentType = file.type || contentTypeForFilename(filename);

  const presignRes = await fetch("/api/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename,
      trip: FAMILY_AVATAR_TRIP,
      contentType,
      contentLength: file.size,
    }),
  });
  const presignData = await presignRes.json();
  if (!presignRes.ok) {
    throw new Error(presignData.error ?? "Failed to prepare upload");
  }

  const putRes = await fetch(presignData.uploadUrl as string, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });
  if (!putRes.ok) {
    throw new Error(`Storage upload failed (${putRes.status})`);
  }

  return String(presignData.publicUrl);
}

function AvatarDropzone({
  imageUrl,
  previewUrl,
  disabled,
  busy,
  label,
  onFile,
  onClear,
}: {
  imageUrl?: string | null;
  previewUrl?: string | null;
  disabled?: boolean;
  busy?: boolean;
  label: string;
  onFile: (file: File) => void;
  onClear?: () => void;
}) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif"] },
    multiple: false,
    disabled: disabled || busy,
    onDrop: (files) => {
      const file = files[0];
      if (file) onFile(file);
    },
  });

  const shown = previewUrl || imageUrl || null;

  return (
    <div className="relative">
      <div
        {...getRootProps()}
        className={cn(
          "group relative flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed text-zinc-500 transition",
          isDragActive
            ? "border-zinc-900 bg-zinc-100 dark:border-white dark:bg-zinc-800"
            : "border-zinc-300 bg-zinc-50 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:border-zinc-500",
          (disabled || busy) && "cursor-not-allowed opacity-60",
        )}
        aria-label={label}
      >
        <input {...getInputProps()} />
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shown}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 px-2 text-center">
            <ImagePlus className="h-5 w-5" />
            <span className="text-[10px] leading-tight">Drop image</span>
          </div>
        )}
      </div>
      {shown && onClear && !busy ? (
        <button
          type="button"
          onClick={onClear}
          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          aria-label="Remove image"
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  );
}

export function FamilyAccountsPanel() {
  const confirm = useConfirm();
  const [users, setUsers] = useState<FamilyUserPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [createImageFile, setCreateImageFile] = useState<File | null>(null);
  const [createPreviewUrl, setCreatePreviewUrl] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editPassword, setEditPassword] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/family-users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load users");
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (err) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to load users",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    return () => {
      if (createPreviewUrl) URL.revokeObjectURL(createPreviewUrl);
    };
  }, [createPreviewUrl]);

  const setCreateImage = (file: File | null) => {
    if (createPreviewUrl) URL.revokeObjectURL(createPreviewUrl);
    setCreateImageFile(file);
    setCreatePreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/family-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          displayName: displayName.trim() || undefined,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create user");

      let created: FamilyUserPublic = data.user;
      if (createImageFile) {
        setUploadingId(created.id);
        try {
          const imageUrl = await uploadAvatarFile(createImageFile, created.id);
          const patchRes = await fetch(
            `/api/family-users/${encodeURIComponent(created.id)}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ imageUrl }),
            },
          );
          const patchData = await patchRes.json();
          if (!patchRes.ok) {
            throw new Error(patchData.error ?? "Account created, but image failed");
          }
          created = patchData.user;
        } finally {
          setUploadingId(null);
        }
      }

      setUsername("");
      setDisplayName("");
      setPassword("");
      setCreateImage(null);
      setNotice({ type: "success", message: `Created ${created.username}.` });
      await loadUsers();
    } catch (err) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to create user",
      });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (user: FamilyUserPublic) => {
    setEditingId(user.id);
    setEditDisplayName(user.displayName);
    setEditPassword("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDisplayName("");
    setEditPassword("");
  };

  const handleUpdate = async (id: string) => {
    if (saving) return;
    setSaving(true);
    setNotice(null);
    try {
      const body: { displayName?: string; password?: string } = {
        displayName: editDisplayName.trim(),
      };
      if (editPassword.trim()) body.password = editPassword;

      const res = await fetch(`/api/family-users/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update user");
      cancelEdit();
      setNotice({
        type: "success",
        message: `Updated ${data.user.username}.`,
      });
      await loadUsers();
    } catch (err) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to update user",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (user: FamilyUserPublic, file: File) => {
    setUploadingId(user.id);
    setNotice(null);
    try {
      const imageUrl = await uploadAvatarFile(file, user.id);
      const res = await fetch(
        `/api/family-users/${encodeURIComponent(user.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save image");
      setNotice({
        type: "success",
        message: `Updated photo for ${data.user.username}.`,
      });
      await loadUsers();
    } catch (err) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to upload image",
      });
    } finally {
      setUploadingId(null);
    }
  };

  const handleAvatarClear = async (user: FamilyUserPublic) => {
    setUploadingId(user.id);
    setNotice(null);
    try {
      const res = await fetch(
        `/api/family-users/${encodeURIComponent(user.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: null }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to remove image");
      setNotice({
        type: "success",
        message: `Removed photo for ${data.user.username}.`,
      });
      await loadUsers();
    } catch (err) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to remove image",
      });
    } finally {
      setUploadingId(null);
    }
  };

  const handleDelete = async (user: FamilyUserPublic) => {
    const affirmed = await confirm({
      title: "Delete family account?",
      message: `Remove “${user.displayName}” (${user.username})? They will no longer be able to sign in.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      destructive: true,
    });
    if (!affirmed) return;

    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch(
        `/api/family-users/${encodeURIComponent(user.id)}`,
        { method: "DELETE" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to delete user");
      if (editingId === user.id) cancelEdit();
      setNotice({
        type: "success",
        message: `Deleted ${user.username}.`,
      });
      await loadUsers();
    } catch (err) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to delete user",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="space-y-1">
          <h2 className="font-serif text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Family accounts
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Create and manage family usernames, passwords, and profile photos.
            Drag an image onto an account to set their photo.
          </p>
        </div>

        {notice ? (
          <div
            role="alert"
            className={cn(
              "rounded-xl border px-3 py-2 text-sm",
              notice.type === "success"
                ? "border-emerald-300/60 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-950/50 dark:text-emerald-100"
                : "border-red-300/60 bg-red-50 text-red-900 dark:border-red-500/40 dark:bg-red-950/50 dark:text-red-100",
            )}
          >
            {notice.message}
          </div>
        ) : null}

        <form
          onSubmit={(e) => void handleCreate(e)}
          className="space-y-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Add account
          </p>

          <div className="flex items-center gap-4 rounded-xl border-2 border-dashed border-zinc-300 p-4 dark:border-zinc-700">
            <AvatarDropzone
              previewUrl={createPreviewUrl}
              disabled={saving}
              label="Drop profile image"
              onFile={(file) => setCreateImage(file)}
              onClear={() => setCreateImage(null)}
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                Profile photo
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Drag and drop an image here, or click the square to browse.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="off"
                required
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                placeholder="mom"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                Display name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                placeholder="Mom"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={saving || !username || !password}
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
              >
                {saving ? "Saving…" : "Add family account"}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="space-y-1">
          <h2 className="font-serif text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Accounts {loading ? "" : `(${users.length})`}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Family accounts that can sign in to browse the gallery.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : users.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
            No family accounts yet.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {users.map((user) => {
              const isEditing = editingId === user.id;
              return (
                <div
                  key={user.id}
                  className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-950/40"
                >
                  <div className="flex items-start gap-4">
                    <AvatarDropzone
                      imageUrl={user.imageUrl}
                      busy={uploadingId === user.id}
                      disabled={saving}
                      label={`Drop image for ${user.displayName}`}
                      onFile={(file) => void handleAvatarUpload(user, file)}
                      onClear={
                        user.imageUrl
                          ? () => void handleAvatarClear(user)
                          : undefined
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-serif text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                        {user.displayName}
                      </p>
                      <p className="text-sm text-zinc-500">@{user.username}</p>
                      <div className="mt-3 flex gap-2">
                        {!isEditing ? (
                          <button
                            type="button"
                            onClick={() => startEdit(user)}
                            disabled={saving}
                            className="rounded-full border border-zinc-200 px-3 py-1 text-xs dark:border-zinc-700"
                          >
                            Edit
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void handleDelete(user)}
                          disabled={saving}
                          className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-600 dark:border-red-900 dark:text-red-400"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="grid gap-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                          Display name
                        </label>
                        <input
                          type="text"
                          value={editDisplayName}
                          onChange={(e) => setEditDisplayName(e.target.value)}
                          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                          New password (optional)
                        </label>
                        <input
                          type="password"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          autoComplete="new-password"
                          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                          placeholder="Leave blank to keep"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void handleUpdate(user.id)}
                          disabled={saving || !editDisplayName.trim()}
                          className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={saving}
                          className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs dark:border-zinc-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
