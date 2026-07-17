"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatTagLabel } from "@/lib/photo-tags";
import { cn } from "@/lib/utils";

export type TripTagOption = {
  tag: string;
  count: number;
};

const ALL_TAGS_VALUE = "__all__";

type TripTagFilterProps = {
  tags: TripTagOption[];
  value: string | null;
  onChange: (tag: string | null) => void;
  className?: string;
};

export function TripTagFilter({
  tags,
  value,
  onChange,
  className,
}: TripTagFilterProps) {
  if (tags.length === 0) return null;

  return (
    <Select
      value={value ?? ALL_TAGS_VALUE}
      onValueChange={(next) =>
        onChange(next === ALL_TAGS_VALUE ? null : next)
      }
    >
      <SelectTrigger
        className={cn(
          "h-auto w-auto min-w-38 shrink-0 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:min-w-44",
          className,
        )}
        aria-label="Filter by tag"
      >
        <SelectValue placeholder="All tags" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_TAGS_VALUE} className="text-xs">
          All tags
        </SelectItem>
        {tags.map(({ tag, count }) => (
          <SelectItem key={tag} value={tag} className="text-xs">
            #{formatTagLabel(tag)}
            <span className="ml-1.5 tabular-nums opacity-60">{count}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
