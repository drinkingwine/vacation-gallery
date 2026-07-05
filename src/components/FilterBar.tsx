"use client";

import type { SortField, SortOrder } from "@/lib/types";

type FilterBarProps = {
  sortField: SortField;
  sortOrder: SortOrder;
  search: string;
  total: number;
  onSortField: (field: SortField) => void;
  onSortOrder: (order: SortOrder) => void;
  onSearch: (search: string) => void;
};

export function FilterBar({
  sortField,
  sortOrder,
  search,
  total,
  onSortField,
  onSortOrder,
  onSearch,
}: FilterBarProps) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <div className="relative min-w-[160px] max-w-xs flex-1">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search photos..."
          className="h-9 w-full rounded-full border border-zinc-200 bg-white/80 py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder-zinc-400 backdrop-blur focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100"
        />
      </div>

      <select
        value={sortField}
        onChange={(e) => onSortField(e.target.value as SortField)}
        className="h-9 rounded-full border border-zinc-200 bg-white/80 px-3 text-sm text-zinc-700 backdrop-blur focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-200"
      >
        <option value="name">Name</option>
        <option value="size">Size</option>
      </select>

      <button
        type="button"
        onClick={() => onSortOrder(sortOrder === "asc" ? "desc" : "asc")}
        className="h-9 rounded-full border border-zinc-200 bg-white/80 px-3 text-zinc-600 backdrop-blur transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/80 dark:hover:bg-zinc-800"
        title={sortOrder === "asc" ? "Sort descending" : "Sort ascending"}
      >
        {sortOrder === "asc" ? "↑" : "↓"}
      </button>

      <span className="ml-auto text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        {total} photo{total !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
