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
      <div className="relative min-w-[160px] flex-1 max-w-xs">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
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
          className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-3 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-terracotta/40"
        />
      </div>

      <select
        value={sortField}
        onChange={(e) => onSortField(e.target.value as SortField)}
        className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-terracotta/40"
      >
        <option value="name">Name</option>
        <option value="size">Size</option>
      </select>

      <button
        type="button"
        onClick={() => onSortOrder(sortOrder === "asc" ? "desc" : "asc")}
        className="rounded-xl border border-stone-200 bg-white p-2 text-stone-600 transition-colors hover:bg-stone-50"
        title={sortOrder === "asc" ? "Sort descending" : "Sort ascending"}
      >
        {sortOrder === "asc" ? "↑" : "↓"}
      </button>

      <span className="ml-auto text-sm text-stone-500">
        {total} photo{total !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
