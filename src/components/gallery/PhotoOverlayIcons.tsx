import { Download, Loader2, Pencil, Star, Trash2, Video } from "lucide-react";
import { formatPhotoTimestamp } from "@/lib/photo-details";
import { FAVORITE_TAG, formatTagLabel, getPresetTagColorClasses, isPresetPhotoTag } from "@/lib/photo-tags";
import { cn } from "@/lib/utils";

type Variant = "overlay" | "toolbar";

const variantStyles = {
  overlay: {
    badge:
      "border-white/30 bg-black/55 text-white backdrop-blur",
    button:
      "border-white/20 bg-black/60 text-white backdrop-blur",
    defaultBadge: "text-amber-300",
    editHover: "hover:bg-indigo-600",
    deleteHover: "hover:bg-red-600",
    downloadHover: "hover:bg-sky-600",
    makeDefaultHover: "hover:bg-amber-600",
  },
  toolbar: {
    badge:
      "border-slate-600 bg-slate-700 text-slate-200",
    button:
      "border-slate-600 bg-slate-700 text-slate-200",
    defaultBadge: "text-amber-400",
    editHover:
      "hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300",
    deleteHover:
      "hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-500/40 dark:hover:bg-red-500/10 dark:hover:text-red-300",
    downloadHover:
      "hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600 dark:hover:border-sky-500/40 dark:hover:bg-sky-500/10 dark:hover:text-sky-300",
    makeDefaultHover:
      "hover:border-amber-200 hover:bg-amber-50 hover:text-amber-600 dark:hover:border-amber-500/40 dark:hover:bg-amber-500/10 dark:hover:text-amber-300",
  },
} as const;

const cardFooterShell = "bg-slate-800 px-2 py-1.5";
const cardFooterTopDivider = "border-t border-slate-500/80";
const cardFooterSectionDivider =
  "border-t-2 border-slate-400/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]";
const toolbarAccent = {
  video: "border-slate-600 bg-slate-700 text-violet-400",
} as const;

const iconSizeClass =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors";

const toolbarActionClass =
  "flex flex-1 items-center justify-center py-1.5 text-xs font-medium transition-colors disabled:opacity-50";

export function PhotoCardEditDeleteBar({
  onEdit,
  onDelete,
  editDisabled,
  deleteBusy,
  className,
}: {
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  editDisabled?: boolean;
  deleteBusy?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-[8.5rem] overflow-hidden rounded-md",
        className,
      )}
    >
      <button
        type="button"
        title="Edit"
        aria-label="Edit"
        onClick={onEdit}
        disabled={editDisabled || deleteBusy}
        className={cn(
          toolbarActionClass,
          "bg-green-600 text-slate-800 hover:bg-green-500",
        )}
      >
        Edit
      </button>
      <div className="w-px shrink-0 self-stretch bg-slate-800" aria-hidden />
      <button
        type="button"
        title="Delete"
        aria-label="Delete"
        onClick={onDelete}
        disabled={deleteBusy}
        className={cn(
          toolbarActionClass,
          "bg-red-600 text-slate-800 hover:bg-red-500",
        )}
      >
        {deleteBusy ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          "Delete"
        )}
      </button>
    </div>
  );
}

type IconButtonProps = {
  label: string;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  busy?: boolean;
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
};

function IconButton({
  label,
  onClick,
  disabled,
  busy,
  variant = "overlay",
  className,
  children,
}: IconButtonProps) {
  const styles = variantStyles[variant];

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled || busy}
      className={cn(iconSizeClass, styles.button, className)}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : children}
    </button>
  );
}

export function PhotoCardToolbar({
  children,
  className,
  centered = false,
}: {
  children: React.ReactNode;
  className?: string;
  centered?: boolean;
}) {
  return (
    <div
      className={cn(
        cardFooterShell,
        cardFooterTopDivider,
        "flex items-center gap-2 text-slate-200",
        centered ? "justify-center" : "justify-between",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DefaultPhotoBadge({
  className,
  variant = "overlay",
}: {
  className?: string;
  variant?: Variant;
}) {
  const styles = variantStyles[variant];

  return (
    <span
      title="Default photo"
      aria-label="Default photo"
      className={cn(
        iconSizeClass,
        styles.badge,
        styles.defaultBadge,
        className,
      )}
    >
      <Star className="h-3.5 w-3.5 fill-current" />
    </span>
  );
}

export function MakeDefaultIconButton({
  onClick,
  disabled,
  busy,
  active = false,
  variant = "overlay",
  className,
}: {
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  busy?: boolean;
  /** When true, this photo is the trip default — click clears it. */
  active?: boolean;
  variant?: Variant;
  className?: string;
}) {
  const styles = variantStyles[variant];

  return (
    <IconButton
      label={active ? "Remove default" : "Make default"}
      onClick={onClick}
      disabled={disabled}
      busy={busy}
      variant={variant}
      className={cn(
        styles.makeDefaultHover,
        active && styles.defaultBadge,
        className,
      )}
    >
      <Star className={cn("h-3.5 w-3.5", active && "fill-current")} />
    </IconButton>
  );
}

export function EditIconButton({
  onClick,
  disabled,
  busy,
  variant = "overlay",
  className,
}: {
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  busy?: boolean;
  variant?: Variant;
  className?: string;
}) {
  const styles = variantStyles[variant];

  return (
    <IconButton
      label="Edit"
      onClick={onClick}
      disabled={disabled}
      busy={busy}
      variant={variant}
      className={cn(styles.editHover, className)}
    >
      <Pencil className="h-3.5 w-3.5" />
    </IconButton>
  );
}

export function DeleteIconButton({
  onClick,
  disabled,
  busy,
  variant = "overlay",
  className,
}: {
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  busy?: boolean;
  variant?: Variant;
  className?: string;
}) {
  const styles = variantStyles[variant];

  return (
    <IconButton
      label="Delete"
      onClick={onClick}
      disabled={disabled}
      busy={busy}
      variant={variant}
      className={cn(styles.deleteHover, className)}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </IconButton>
  );
}

export function DownloadIconButton({
  onClick,
  disabled,
  busy,
  variant = "overlay",
  className,
}: {
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  busy?: boolean;
  variant?: Variant;
  className?: string;
}) {
  const styles = variantStyles[variant];

  return (
    <IconButton
      label="Download"
      onClick={onClick}
      disabled={disabled}
      busy={busy}
      variant={variant}
      className={cn(styles.downloadHover, className)}
    >
      <Download className="h-3.5 w-3.5" />
    </IconButton>
  );
}

export function VideoTypeBadge({
  className,
  variant = "overlay",
}: {
  className?: string;
  variant?: Variant;
}) {
  const styles = variantStyles[variant];

  return (
    <span
      title="Video"
      aria-label="Video"
      className={cn(
        iconSizeClass,
        styles.badge,
        variant === "toolbar" && toolbarAccent.video,
        className,
      )}
    >
      <Video className="h-3.5 w-3.5" />
    </span>
  );
}

export function PhotoTimestampOverlay({
  dateTaken,
  className,
}: {
  dateTaken?: string | null;
  className?: string;
}) {
  const label = formatPhotoTimestamp(dateTaken) ?? "No timestamp";

  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-2 left-2 z-10 max-w-[calc(100%-1rem)] rounded bg-black/65 px-2 py-1 font-mono text-[10px] leading-tight text-white backdrop-blur-sm",
        className,
      )}
    >
      {label}
    </div>
  );
}

export function PhotoTagBadges({
  tags,
  className,
  dividedFromToolbar = false,
}: {
  tags: string[];
  className?: string;
  dividedFromToolbar?: boolean;
}) {
  if (!tags.length) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap gap-1.5",
        cardFooterShell,
        dividedFromToolbar ? cardFooterSectionDivider : cardFooterTopDivider,
        className,
      )}
    >
      {tags.map((tag) => {
        const isFavoriteTag = tag.toLowerCase() === FAVORITE_TAG;
        return (
          <span
            key={tag}
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-medium",
              isFavoriteTag
                ? "border-rose-500/50 bg-rose-950/60 text-rose-300"
                : "border-slate-600 bg-slate-700 text-slate-200",
            )}
          >
            #{formatTagLabel(tag)}
          </span>
        );
      })}
    </div>
  );
}

export function PhotoTagOverlay({
  tags,
  className,
}: {
  tags: string[];
  className?: string;
}) {
  if (!tags.length) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-10",
        className,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1.5 px-3 pb-3">
        {tags.map((tag) => {
          const isFavoriteTag = tag.toLowerCase() === FAVORITE_TAG;
          const presetClasses = isPresetPhotoTag(tag)
            ? getPresetTagColorClasses(tag)
            : null;

          return (
            <span
              key={tag}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-medium shadow-sm",
                isFavoriteTag
                  ? "border-rose-400/70 bg-rose-950/80 text-rose-200"
                  : presetClasses ??
                      "border-white/25 bg-black/50 text-white backdrop-blur-sm",
              )}
            >
              #{formatTagLabel(tag)}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function PhotoTagHoverOverlay({
  tags,
  className,
}: {
  tags: string[];
  className?: string;
}) {
  if (!tags.length) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100",
        className,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1.5 px-3 pb-3">
        {tags.map((tag) => {
          const isFavoriteTag = tag.toLowerCase() === FAVORITE_TAG;
          const presetClasses = isPresetPhotoTag(tag)
            ? getPresetTagColorClasses(tag)
            : null;

          return (
            <span
              key={tag}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-medium shadow-sm",
                isFavoriteTag
                  ? "border-rose-400/70 bg-rose-950/80 text-rose-200"
                  : presetClasses ??
                      "border-white/25 bg-black/50 text-white backdrop-blur-sm",
              )}
            >
              #{formatTagLabel(tag)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
