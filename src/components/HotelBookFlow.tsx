"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createHotelBooking } from "@/lib/api";
import { nextDays } from "@/lib/format";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { displayName, useAuth } from "@/lib/auth";
import { recordBooking } from "@/lib/mybookings";
import type { Restaurant } from "@/lib/types";

const TABLE_TYPES = [
  { value: "single", label: "Single table" },
  { value: "6", label: "6 tables" },
  { value: "8", label: "8 tables" },
  { value: "others", label: "Others" },
];

const RESERVATION_TYPES = [
  "Single Reservation",
  "Group Reservation",
  "Business Reservation",
];

const TIMES = ["12:00", "13:00", "14:00", "18:00", "19:00", "20:00", "21:00"];

type Phase = "form" | "done";

export function HotelBookFlow({ restaurant }: { restaurant: Restaurant }) {
  const { user } = useAuth();
  const hotelId = parseInt(restaurant.slug.replace("hotel-", ""), 10);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(nextDays()[0]);
  const [time, setTime] = useState("19:00");
  const [party, setParty] = useState(2);
  const [tableType, setTableType] = useState("single");
  const [reservationType, setReservationType] = useState(
    "Single Reservation",
  );
  const [phase, setPhase] = useState<Phase>("form");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Prefill from the signed-in profile (once).
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (user && !prefilled) {
      const n = displayName(user);
      if (n) {
        const parts = n.split(" ");
        if (!firstName) setFirstName(parts[0] ?? "");
        if (!lastName) setLastName(parts.slice(1).join(" "));
      }
      if (user.email && !email) setEmail(user.email);
      if (user.phoneNumber && !phone) setPhone(user.phoneNumber);
      setPrefilled(true);
    }
  }, [user, prefilled, firstName, lastName, email, phone]);

  async function submit() {
    setError("");
    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      setError("Please enter your first and last name.");
      return;
    }
    if (!/.+@.+\..+/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (phone.trim().length < 7) {
      setError("Please enter a valid phone number.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await createHotelBooking(hotelId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        date,
        time,
        guestNumber: party,
        tableType,
        reservationType,
        customerId: user ? String(user.id) : undefined,
      });
      recordBooking({
        ref: `hotel-${res.id}`,
        userId: user ? String(user.id) : "guest",
        kind: "reservation",
        restaurantId: restaurant.id,
        restaurantSlug: restaurant.slug,
        restaurantName: restaurant.name,
        date,
        time,
        partySize: party,
      });
      track("booking_confirmed", {
        restaurant_id: restaurant.id,
        datetime: `${date} ${time}`,
        party_size: party,
      });
      setPhase("done");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not complete the booking. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (phase === "done") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center">
        <p className="text-[48px]">🎉</p>
        <h1 className="mt-3 text-[24px] font-black text-white">
          Table booked!
        </h1>
        <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-stone-400">
          Your reservation at{" "}
          <span className="font-semibold text-white">{restaurant.name}</span>{" "}
          for <span className="font-semibold text-white">{party}</span> on{" "}
          <span className="font-semibold text-white">{date}</span> at{" "}
          <span className="font-semibold text-white">{time}</span> is confirmed.
          A confirmation email is on its way to {email}.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/bookings">
            <Button>My bookings</Button>
          </Link>
          <Link href={`/restaurants/${restaurant.slug}`}>
            <Button variant="secondary">Back to {restaurant.name}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const days = nextDays(30);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href={`/restaurants/${restaurant.slug}`}
        className="text-[13px] font-semibold text-stone-400 hover:text-white"
      >
        ← Back to {restaurant.name}
      </Link>
      <h1 className="mt-4 text-[26px] font-black text-white">Book a table</h1>
      <p className="mt-1 text-[14px] text-stone-400">
        Your reservation goes straight into {restaurant.name}&apos;s booking
        diary.
      </p>

      <div className="mt-6 flex flex-col gap-4 rounded-3xl border border-ink-800 bg-ink-900 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Adaeze"
          />
          <Input
            label="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Okafor"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            inputMode="email"
          />
          <Input
            label="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0803 000 0000"
            inputMode="tel"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-stone-300">
            Date
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {days.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDate(d)}
                className={`shrink-0 rounded-2xl px-3 py-2 text-[13px] font-semibold ${
                  date === d
                    ? "bg-amber-400 text-ink-950"
                    : "bg-ink-800 text-stone-300"
                }`}
              >
                {new Date(d + "T12:00:00").toLocaleDateString("en-NG", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-stone-300">
            Time
          </label>
          <div className="flex flex-wrap gap-2">
            {TIMES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTime(t)}
                className={`rounded-full px-4 py-2 text-[13px] font-semibold ${
                  time === t
                    ? "bg-amber-400 text-ink-950"
                    : "bg-ink-800 text-stone-300"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-stone-300">
              Guests
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setParty((p) => Math.max(1, p - 1))}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-ink-600 bg-ink-800 text-xl text-white"
                aria-label="Fewer guests"
              >
                −
              </button>
              <span className="text-[16px] font-extrabold text-white">
                {party} {party === 1 ? "guest" : "guests"}
              </span>
              <button
                type="button"
                onClick={() => setParty((p) => Math.min(30, p + 1))}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-ink-600 bg-ink-800 text-xl text-white"
                aria-label="More guests"
              >
                +
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-stone-300">
              Table type
            </label>
            <select
              value={tableType}
              onChange={(e) => setTableType(e.target.value)}
              className="w-full rounded-2xl border border-ink-700 bg-ink-800 px-4 py-3 text-[14px] text-white focus:border-amber-400 focus:outline-none"
            >
              {TABLE_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-stone-300">
            Reservation type
          </label>
          <div className="flex flex-wrap gap-2">
            {RESERVATION_TYPES.map((rt) => (
              <button
                key={rt}
                type="button"
                onClick={() => setReservationType(rt)}
                className={`rounded-full px-4 py-2 text-[13px] font-semibold ${
                  reservationType === rt
                    ? "bg-amber-400 text-ink-950"
                    : "bg-ink-800 text-stone-300"
                }`}
              >
                {rt}
              </button>
            ))}
          </div>
        </div>

        {error ? <p className="text-[13px] text-red-300">{error}</p> : null}
        <Button onClick={submit} disabled={submitting} size="lg" fullWidth>
          {submitting ? "Booking…" : "Confirm booking →"}
        </Button>
        <p className="text-[12px] leading-5 text-stone-500">
          Free to book. The restaurant confirms by email — please arrive on
          time or cancel from My bookings.
        </p>
      </div>
    </div>
  );
}
