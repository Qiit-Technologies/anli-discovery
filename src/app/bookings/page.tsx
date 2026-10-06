"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import {
  cancelBooking,
  listBookings,
  type MyBooking,
} from "@/lib/mybookings";
import { fetchCustomerReservations, cancelHotelBooking } from "@/lib/api";
import { formatDate, formatTimeLabel } from "@/lib/format";

function statusBadge(s: MyBooking["status"]) {
  if (s === "upcoming")
    return (
      <span className="rounded-full bg-brand-500/15 px-2.5 py-1 text-[11px] font-extrabold text-brand-300">
        UPCOMING
      </span>
    );
  if (s === "done")
    return (
      <span className="rounded-full bg-ink-700 px-2.5 py-1 text-[11px] font-extrabold text-stone-400">
        PAST
      </span>
    );
  return (
    <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-[11px] font-extrabold text-red-300">
        CANCELLED
      </span>
  );
}

function BookingCard({
  booking,
  onCancel,
}: {
  booking: MyBooking;
  onCancel: (ref: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="rounded-3xl border border-ink-800 bg-ink-900 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            href={`/restaurants/${booking.restaurantId}`}
            className="text-[16px] font-bold text-stone-100 hover:text-brand-300"
          >
            {booking.restaurantName}
          </Link>
          <p className="mt-1 text-[13px] text-stone-400">
            {formatDate(booking.date)} · {formatTimeLabel(booking.time)} ·{" "}
            {booking.partySize} {booking.partySize === 1 ? "guest" : "guests"}
          </p>
          <p className="mt-1 text-[12px] text-stone-600">
            {booking.kind === "reservation" ? "Table booking" : "Booking request"}{" "}
            · Ref {booking.ref.slice(0, 8).toUpperCase()}
          </p>
        </div>
        {statusBadge(booking.status)}
      </div>
      {booking.status === "upcoming" &&
        (confirming ? (
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => onCancel(booking.ref)}
              className="h-10 flex-1 rounded-2xl bg-red-500 text-[13px] font-bold text-white"
            >
              Yes, cancel it
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="h-10 rounded-2xl border border-ink-700 px-5 text-[13px] font-bold text-stone-300"
            >
              Keep it
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="mt-3 h-10 w-full rounded-2xl border border-ink-700 text-[13px] font-bold text-stone-300"
          >
            Cancel booking
          </button>
        ))}
      {booking.status === "done" && booking.restaurantSlug && (
        <Link
          href={`/restaurants/${booking.restaurantSlug}`}
          className="mt-3 block h-10 w-full rounded-2xl bg-amber-400/15 text-center text-[13px] font-bold leading-10 text-amber-300 hover:bg-amber-400/25"
        >
          ★ Rate your visit
        </Link>
      )}
    </div>
  );
}

export default function BookingsPage() {
  const { user, token, ready } = useAuth();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [cancelError, setCancelError] = useState("");

  const userId = user ? String(user.id) : "guest";

  useEffect(() => {
    if (!ready) return;
    const local = listBookings(userId);
    setBookings(local);
    // Merge real backend reservations for signed-in customers.
    if (user) {
      fetchCustomerReservations(String(user.id)).then((remote) => {
        if (!remote.length) return;
        const mapped: MyBooking[] = remote.map((r) => {
          const d = new Date(r.date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return {
            ref: `remote-${r.id}`,
            userId,
            kind: "reservation" as const,
            restaurantId: r.hotel ? `hotel-${r.hotel.id}` : `remote-${r.id}`,
            restaurantSlug: r.hotel ? `hotel-${r.hotel.id}` : undefined,
            restaurantName: r.hotel?.name ?? "Restaurant",
            date: r.date.slice(0, 10),
            time: (r.time ?? "").slice(0, 5),
            partySize: r.guestNumber,
            status: d >= today ? ("upcoming" as const) : ("done" as const),
            createdAt: r.createdAt,
          };
        });
        // De-dupe against local records made via this app (same hotel+date+time).
        setBookings((prev) => {
          const keys = new Set(
            prev.map((b) => `${b.restaurantId}|${b.date}|${b.time}`),
          );
          const fresh = mapped.filter(
            (m) =>
              !keys.has(`${m.restaurantId}|${m.date}|${m.time}`) &&
              !prev.some((b) => b.ref === m.ref),
          );
          return [...fresh, ...prev].sort((a, b) =>
            b.date.localeCompare(a.date),
          );
        });
      });
    }
  }, [ready, userId, user]);

  if (!ready) {
    return (
      <div className="px-4 pt-10 text-center text-[14px] text-stone-500">
        Loading…
      </div>
    );
  }

  const upcoming = bookings.filter((b) => b.status === "upcoming");
  const past = bookings.filter((b) => b.status !== "upcoming");
  const shown = tab === "upcoming" ? upcoming : past;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6">
      <h1 className="text-[24px] font-extrabold tracking-tight text-white">
        My bookings
      </h1>
      <p className="mt-1 text-[14px] text-stone-400">
        {user
          ? "Bookings made on this device, tied to your account."
          : "Bookings made on this device. Sign in to keep them tied to your account."}
      </p>
      {!user && (
        <Link
          href="/login"
          className="mt-3 inline-block rounded-full bg-brand-500 px-5 py-2.5 text-[13px] font-bold text-white"
        >
          Sign in
        </Link>
      )}

      <div className="mt-5 grid grid-cols-2 rounded-2xl bg-ink-900 p-1">
        {(["upcoming", "past"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-xl py-2.5 text-[14px] font-bold ${
              tab === t ? "bg-ink-700 text-white" : "text-stone-500"
            }`}
          >
            {t === "upcoming"
              ? `Upcoming (${upcoming.length})`
              : `Past (${past.length})`}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {cancelError ? (
          <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-[13px] font-semibold text-red-300">
            {cancelError}
          </p>
        ) : null}
        {shown.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-ink-600 bg-ink-900 px-6 py-12 text-center">
            <p className="text-3xl" aria-hidden>
              🎟️
            </p>
            <p className="mt-3 font-bold text-stone-200">
              {tab === "upcoming" ? "No upcoming bookings" : "No past bookings"}
            </p>
            <p className="mt-1 text-[14px] text-stone-500">
              {tab === "upcoming"
                ? "Find a spot and book a table — it will show up here."
                : "Your finished and cancelled bookings will appear here."}
            </p>
            {tab === "upcoming" && (
              <Link
                href="/"
                className="mt-4 inline-block rounded-full bg-brand-500 px-6 py-2.5 text-[14px] font-bold text-white"
              >
                Discover restaurants
              </Link>
            )}
          </div>
        ) : (
          shown.map((b) => (
            <BookingCard
              key={b.ref}
              booking={b}
              onCancel={async (ref) => {
                setCancelError("");
                // Remote (backend) reservations cancel via the API.
                if (ref.startsWith("remote-") && token) {
                  const id = parseInt(ref.replace("remote-", ""), 10);
                  try {
                    await cancelHotelBooking(id, token);
                  } catch (e) {
                    setCancelError(
                      e instanceof Error
                        ? e.message
                        : "Could not cancel the reservation.",
                    );
                    return;
                  }
                  setBookings((prev) =>
                    prev.map((x) =>
                      x.ref === ref
                        ? { ...x, status: "cancelled" as const }
                        : x,
                    ),
                  );
                  return;
                }
                cancelBooking(ref);
                setBookings(listBookings(userId));
              }}
            />
          ))
        )}
      </div>
      <div className="h-8" />
    </div>
  );
}
