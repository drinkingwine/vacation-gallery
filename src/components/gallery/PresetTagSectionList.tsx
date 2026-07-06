import {
  formatTagLabel,
  getPresetTagColorClasses,
  hasPhotoTag,
  PRESET_PHOTO_TAG_SECTIONS,
} from "@/lib/photo-tags";
import { cn } from "@/lib/utils";

const sectionLabelClass =
  "text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500";
const sectionDividerClass = "border-t border-zinc-200 pt-3 dark:border-zinc-800";

type PresetTagSectionListProps = {
  activeTags: string[];
  mode: "assigned" | "available";
  extraTags?: string[];
  onAssign?: (tag: string) => void;
  onRemove?: (tag: string) => void;
};

export function PresetTagSectionList({
  activeTags,
  mode,
  extraTags = [],
  onAssign,
  onRemove,
}: PresetTagSectionListProps) {
  const sections = PRESET_PHOTO_TAG_SECTIONS.map((section) => {
    const presetTags = section.tags.filter((tag) =>
      mode === "assigned"
        ? hasPhotoTag(activeTags, tag)
        : !hasPhotoTag(activeTags, tag),
    );
    const miscTags =
      section.label === "Misc" && mode === "assigned" ? extraTags : [];

    return {
      label: section.label,
      tags: [...presetTags, ...miscTags],
    };
  }).filter((section) => section.tags.length > 0);

  if (!sections.length) return null;

  return (
    <div className="space-y-3">
      {sections.map((section, index) => (
        <div
          key={section.label}
          className={cn(index > 0 && sectionDividerClass)}
        >
          <h4 className={cn(sectionLabelClass, "mb-2")}>{section.label}</h4>
          <div className="flex flex-wrap gap-2">
            {section.tags.map((tag) =>
              mode === "assigned" ? (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onRemove?.(tag)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-500/40 dark:hover:bg-red-500/20 dark:hover:text-red-300",
                    getPresetTagColorClasses(tag),
                  )}
                  title="Remove tag"
                >
                  #{formatTagLabel(tag)} ×
                </button>
              ) : (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onAssign?.(tag)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition hover:opacity-90",
                    getPresetTagColorClasses(tag),
                  )}
                >
                  {formatTagLabel(tag)}
                </button>
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
