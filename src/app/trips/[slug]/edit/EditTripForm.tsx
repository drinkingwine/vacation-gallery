"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { formFieldClass } from "@/lib/form-styles";
import { toDateInputValue } from "@/lib/trip-meta";
import type { Trip } from "@/lib/types";
import { updateTripAction } from "./actions";

type EditTripFormProps = {
  trip: Trip;
};

export function EditTripForm({ trip }: EditTripFormProps) {
  const [state, formAction, isPending] = useActionState(updateTripAction, null);
  const tripHref = `/trips/${encodeURIComponent(trip.name)}`;

  return (
    <>
      <Header backHref={tripHref} backLabel="Back to trip" />

      <main className="page-container main-offset mx-auto flex-1 px-0 pb-16">
        <div className="mx-auto max-w-lg space-y-6">
          <header className="space-y-1">
            <h1 className="font-serif text-3xl font-semibold text-zinc-900 dark:text-white">
              Edit trip
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{trip.name}</p>
          </header>

          <form
            action={formAction}
            className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <input type="hidden" name="tripName" value={trip.name} />

            <div className="space-y-4 p-5">
              {state?.error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                  {state.error}
                </div>
              )}

              <div>
                <label
                  htmlFor="title"
                  className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Title
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  required
                  defaultValue={trip.title}
                  className={formFieldClass}
                />
              </div>

              <div>
                <label
                  htmlFor="location"
                  className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Location
                </label>
                <input
                  id="location"
                  name="location"
                  type="text"
                  defaultValue={trip.location ?? ""}
                  className={formFieldClass}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="startDate"
                    className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Start date
                  </label>
                  <input
                    id="startDate"
                    name="startDate"
                    type="date"
                    defaultValue={toDateInputValue(trip.startDate)}
                    className={formFieldClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor="endDate"
                    className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    End date
                  </label>
                  <input
                    id="endDate"
                    name="endDate"
                    type="date"
                    defaultValue={toDateInputValue(trip.endDate)}
                    className={formFieldClass}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  defaultValue={trip.description ?? ""}
                  className={formFieldClass}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <Link
                href={tripHref}
                className="rounded-xl px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
              >
                {isPending ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </>
  );
}
