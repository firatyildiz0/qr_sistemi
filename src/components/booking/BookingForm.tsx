"use client";

import { useActionState, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { format } from "date-fns";
import "react-day-picker/style.css";
import { createBooking, type BookingFormState } from "@/app/product/[id]/actions";

const initialState: BookingFormState = { error: null };

export default function BookingForm({
  productId,
  bookedRanges,
}: {
  productId: string;
  bookedRanges: { from: Date; to: Date }[];
}) {
  const action = createBooking.bind(null, productId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [range, setRange] = useState<DateRange | undefined>();
  const [prevState, setPrevState] = useState(state);

  if (state !== prevState) {
    setPrevState(state);
    if (state.success) setRange(undefined);
  }

  const startStr = range?.from ? format(range.from, "yyyy-MM-dd") : "";
  const endStr = range?.to ? format(range.to, "yyyy-MM-dd") : startStr;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="start_date" value={startStr} />
      <input type="hidden" name="end_date" value={endStr} />

      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-700">
          Rental dates
        </label>
        <div className="rounded-lg border border-neutral-200 bg-white p-3">
          <DayPicker
            mode="range"
            excludeDisabled
            selected={range}
            onSelect={setRange}
            disabled={[{ before: new Date(new Date().setHours(0, 0, 0, 0)) }, ...bookedRanges]}
            modifiers={{ booked: bookedRanges }}
            modifiersClassNames={{ booked: "rdp-booked" }}
            numberOfMonths={1}
          />
          <div className="mt-3 flex items-center gap-4 text-xs text-neutral-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-red-200" /> Booked
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm border border-neutral-300" /> Free
            </span>
          </div>
          <style>{`.rdp-booked { background-color: #fecaca; color: #7f1d1d; }`}</style>
        </div>
        {startStr && (
          <p className="mt-2 text-sm text-neutral-600">
            {startStr} → {endStr}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="customer_name" className="block text-sm font-medium text-neutral-700">
          Your name
        </label>
        <input
          id="customer_name"
          name="customer_name"
          required
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-base focus:border-neutral-900 focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="customer_phone"
          className="block text-sm font-medium text-neutral-700"
        >
          Phone (optional)
        </label>
        <input
          id="customer_phone"
          name="customer_phone"
          type="tel"
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-base focus:border-neutral-900 focus:outline-none"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-green-700">Booking confirmed. See you then!</p>
      )}

      <button
        type="submit"
        disabled={pending || !startStr}
        className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Booking…" : "Request booking"}
      </button>
    </form>
  );
}
