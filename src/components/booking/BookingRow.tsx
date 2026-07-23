"use client";

import { useActionState, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { format } from "date-fns";
import "react-day-picker/style.css";
import type { Booking, BookingStatus } from "@/lib/types";
import { cancelBooking, editBooking, type BookingFormState } from "@/app/product/[id]/actions";

const statusStyles: Record<BookingStatus, string> = {
  upcoming: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-neutral-100 text-neutral-600",
  cancelled: "bg-red-100 text-red-700",
};

const initialState: BookingFormState = { error: null };

export default function BookingRow({
  booking,
  status,
  productId,
  otherBookedRanges,
}: {
  booking: Booking;
  status: BookingStatus;
  productId: string;
  otherBookedRanges: { from: Date; to: Date }[];
}) {
  const [editing, setEditing] = useState(false);
  const editAction = editBooking.bind(null, productId, booking.id);
  const [state, formAction, pending] = useActionState(editAction, initialState);
  const [range, setRange] = useState<DateRange | undefined>({
    from: new Date(booking.start_date + "T00:00:00"),
    to: new Date(booking.end_date + "T00:00:00"),
  });

  const canModify = status !== "cancelled" && status !== "completed";
  const startStr = range?.from ? format(range.from, "yyyy-MM-dd") : booking.start_date;
  const endStr = range?.to ? format(range.to, "yyyy-MM-dd") : startStr;

  if (editing) {
    return (
      <tr className="border-b border-neutral-100 align-top">
        <td colSpan={6} className="px-4 py-4">
          <form action={formAction} className="space-y-3">
            <input type="hidden" name="start_date" value={startStr} />
            <input type="hidden" name="end_date" value={endStr} />
            <div className="rounded-lg border border-neutral-200 bg-white p-3 inline-block">
              <DayPicker
                mode="range"
                selected={range}
                onSelect={setRange}
                disabled={otherBookedRanges}
                numberOfMonths={1}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <input
                name="customer_name"
                defaultValue={booking.customer_name}
                required
                placeholder="Customer name"
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
              <input
                name="customer_phone"
                defaultValue={booking.customer_phone ?? ""}
                placeholder="Phone"
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            {state.error && <p className="text-sm text-red-600">{state.error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
              >
                {pending ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-neutral-100">
      <td className="px-4 py-3 text-sm text-neutral-900">{booking.customer_name}</td>
      <td className="px-4 py-3 text-sm text-neutral-500">{booking.customer_phone ?? "—"}</td>
      <td className="px-4 py-3 text-sm text-neutral-700">{booking.start_date}</td>
      <td className="px-4 py-3 text-sm text-neutral-700">{booking.end_date}</td>
      <td className="px-4 py-3">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyles[status]}`}
        >
          {status}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-sm">
        {canModify && (
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-neutral-600 hover:text-neutral-900"
            >
              Edit
            </button>
            <form
              action={cancelBooking.bind(null, productId, booking.id)}
              onSubmit={(e) => {
                if (!confirm("Cancel this booking?")) e.preventDefault();
              }}
            >
              <button type="submit" className="text-red-600 hover:text-red-800">
                Cancel
              </button>
            </form>
          </div>
        )}
      </td>
    </tr>
  );
}
