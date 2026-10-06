"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  fetchAvailability,
  createHold,
  confirmHold,
} from "@/lib/api";
import {
  formatDate,
  formatDateShort,
  formatTimeLabel,
  nextDays,
} from "@/lib/format";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Stepper } from "@/components/ui/Stepper";
import { displayName, useAuth } from "@/lib/auth";
import { recordBooking } from "@/lib/mybookings";
import type { AvailabilitySlot, Reservation, Restaurant } from "@/lib/types";

type Phase = "pick" | "details" | "hold" | "done" | "failed";

export function BookFlow({ restaurant }: { restaurant: Restaurant }) {
  const { user } = useAuth();
  const [date, setDate] = useState(nextDays()[0]);
  const [party, setParty] = useState(2);
  const [slot, setSlot] = useState<AvailabilitySlot | null>(null);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [errors, setErrors] = useState<{ name?: string; contact?: string }>({});
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [phase, setPhase] = useState<Phase>("pick");
  const [failReason, setFailReason] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(5 * 60);

  // Prefill diner details from the signed-in profile (once).
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (user && !prefilled) {
      const n = displayName(user);
      if (n && !name) setName(n);
      if (user.phoneNumber && !contact) setContact(user.phoneNumber);
      setPrefilled(true);
    }
  }, [user, prefilled, name, contact]);

  const days = useMemo(() => nextDays(14), []);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);

  // FR-03/FR-04: live availability from the ops backend (mock fallback).
  useEffect(() => {
    let cancelled = false;
    setSlotsLoading(true);
    fetchAvailability(restaurant, date, party)
      .then((s) => {
        if (!cancelled) setSlots(s);
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [restaurant, date, party]);

  // FR-05: hold countdown; release on expiry
  useEffect(() => {
    if (phase !== "hold" || secondsLeft <= 0) return;
    const t = setTimeout(() => {
      if (secondsLeft - 1 <= 0) {
        setFailReason("Your 5-minute hold expired. Please pick a new slot.");
        setPhase("failed");
      }
      setSecondsLeft(secondsLeft - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [phase, secondsLeft]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  const [holding, setHolding] = useState(false);

  async function startHold() {
    const e: typeof errors = {};
    if (name.trim().length < 2) e.name = "Please enter your name.";
    if (contact.replace(/\D/g, "").length < 7)
      e.contact = "Enter a valid phone number or email.";
    setErrors(e);
    if (Object.keys(e).length > 0 || !slot) return;
    setHolding(true);
    try {
      // FR-05: hold the slot server-side (5-min TTL), mock fallback.
      const res = await createHold(restaurant, {
        dinerName: name.trim(),
        dinerContact: contact.trim(),
        date,
        time: slot.time,
        partySize: party,
        customerId: user ? String(user.id) : undefined,
      });
      setReservation(res);
      setSecondsLeft(5 * 60);
      setPhase("hold");
    } catch (err) {
      setFailReason(
        err instanceof Error ? err.message : "Couldn't hold that slot.",
      );
      setPhase("failed");
    } finally {
      setHolding(false);
    }
  }

  async function confirm() {
    if (!reservation) return;
    // FR-06: race-safe confirm — fails gracefully if the hold expired
    const result = await confirmHold(reservation.id);
    if (result.ok) {
      setReservation(result.reservation);
      setPhase("done");
      // Save to My bookings + award loyalty points (device-local for now).
      recordBooking({
        ref: result.reservation.id,
        userId: user ? String(user.id) : "guest",
        kind: "reservation",
        restaurantId: restaurant.id,
        restaurantSlug: restaurant.slug,
        restaurantName: restaurant.name,
        date,
        time: slot?.time ?? "",
        partySize: party,
      });
      track("booking_confirmed", {
        restaurant_id: restaurant.id,
        datetime: `${date} ${slot?.time}`,
        party_size: party,
      });
    } else {
      setFailReason(result.reason);
      setPhase("failed");
    }
  }

  const stepIndex = phase === "pick" ? 0 : phase === "details" ? 1 : 2;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-5">
      <Link
        href={`/restaurants/${restaurant.slug}`}
        className="text-[14px] font-medium text-stone-400"
      >
        ← {restaurant.name}
      </Link>
      <h1 className="mt-2 text-[24px] font-extrabold tracking-tight text-white">
        Book a table
      </h1>

      <div className="mt-4">
        <Stepper
          steps={["Date & party", "Your details", "Confirm"]}
          current={stepIndex}
        />
      </div>

      {phase === "pick" && (
        <div className="mt-6">
          <p className="text-[13px] font-semibold text-stone-400 uppercase tracking-wide">
            Date
          </p>
          <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
            {days.map((d) => (
              <button
                key={d}
                onClick={() => {
                  setDate(d);
                  setSlot(null);
                }}
                className={`flex w-16 shrink-0 flex-col items-center rounded-2xl border py-2.5 transition-colors ${
                  date === d
                    ? "border-brand-500 bg-brand-500/15 text-white"
                    : "border-ink-700 bg-ink-900 text-stone-400"
                }`}
              >
                <span className="text-[11px] font-medium">
                  {formatDateShort(d).split(" ")[0]}
                </span>
                <span className="text-[17px] font-extrabold">
                  {formatDateShort(d).split(" ")[1]}
                </span>
              </button>
            ))}
          </div>

          <p className="mt-5 text-[13px] font-semibold text-stone-400 uppercase tracking-wide">
            Party size
          </p>
          <div className="mt-2 flex items-center gap-4">
            <button
              onClick={() => setParty((p) => Math.max(1, p - 1))}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-ink-600 bg-ink-900 text-xl text-white"
              aria-label="Fewer guests"
            >
              −
            </button>
            <span className="text-[18px] font-extrabold text-white">
              {party} {party === 1 ? "guest" : "guests"}
            </span>
            <button
              onClick={() =>
                setParty((p) => Math.min(restaurant.maxPartySize, p + 1))
              }
              className="flex h-11 w-11 items-center justify-center rounded-full border border-ink-600 bg-ink-900 text-xl text-white"
              aria-label="More guests"
            >
              +
            </button>
          </div>
          {party >= restaurant.maxPartySize && (
            <p className="mt-2 text-[13px] text-amber-300">
              For parties over {restaurant.maxPartySize}, please call the
              restaurant directly.
            </p>
          )}

          <p className="mt-6 text-[13px] font-semibold text-stone-400 uppercase tracking-wide">
            Available times · {formatDate(date)}
          </p>
          {slotsLoading ? (
            <div className="mt-2 rounded-2xl border border-ink-800 bg-ink-900 p-6 text-center">
              <p className="text-[14px] text-stone-500">Checking tables…</p>
            </div>
          ) : slots.length === 0 ? (
            <div className="mt-2 rounded-2xl border border-dashed border-ink-600 bg-ink-900 p-6 text-center">
              <p className="font-bold text-stone-200">No tables left</p>
              <p className="mt-1 text-[14px] text-stone-500">
                Try another date or a different time.
              </p>
            </div>
          ) : (
            <div className="mt-2 grid grid-cols-3 gap-2">
              {slots.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSlot(s)}
                  className={`rounded-2xl border py-3 text-center transition-colors ${
                    slot?.id === s.id
                      ? "border-brand-500 bg-brand-500/15"
                      : "border-ink-700 bg-ink-900"
                  }`}
                >
                  <p className="text-[15px] font-bold text-white">{s.label}</p>
                  <p
                    className={`mt-0.5 text-[11px] ${
                      s.tablesLeft <= 2 ? "text-amber-300" : "text-stone-500"
                    }`}
                  >
                    {s.tablesLeft <= 2
                      ? `Only ${s.tablesLeft} left`
                      : `${s.tablesLeft} tables`}
                  </p>
                </button>
              ))}
            </div>
          )}

          <div className="mt-6">
            <Button
              fullWidth
              size="lg"
              disabled={!slot}
              onClick={() => setPhase("details")}
            >
              Continue →
            </Button>
          </div>
        </div>
      )}

      {phase === "details" && slot && (
        <div className="mt-6">
          <div className="rounded-2xl border border-ink-700 bg-ink-900 p-4">
            <p className="text-[15px] font-bold text-white">
              {formatDate(date)} · {formatTimeLabel(slot.time)}
            </p>
            <p className="text-[14px] text-stone-400">
              {party} {party === 1 ? "guest" : "guests"} · {restaurant.name}
            </p>
            <button
              onClick={() => setPhase("pick")}
              className="mt-2 text-[13px] font-semibold text-brand-300"
            >
              Change
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-4">
            <Input
              label="Full name"
              placeholder="e.g. Adaeze Okonkwo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              autoComplete="name"
            />
            <Input
              label="Phone or WhatsApp"
              placeholder="e.g. 0803 123 4567"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              error={errors.contact}
              hint="Your confirmation will be sent here."
              inputMode="tel"
              autoComplete="tel"
            />
          </div>
          <div className="mt-6">
            <Button fullWidth size="lg" onClick={startHold} disabled={holding}>
              {holding ? "Holding your table…" : "Hold my table →"}
            </Button>
            <p className="mt-3 text-center text-[13px] text-stone-500">
              Your slot is held for 5 minutes while you confirm.
            </p>
          </div>
        </div>
      )}

      {phase === "hold" && reservation && slot && (
        <div className="mt-6 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-500/15 border border-brand-500/40">
            <span className="text-[26px] font-black text-brand-300 tabular-nums">
              {mm}:{ss}
            </span>
          </div>
          <h2 className="mt-4 text-[20px] font-extrabold text-white">
            Table held for you
          </h2>
          <p className="mt-2 text-[14px] leading-6 text-stone-400">
            {formatDate(date)} · {formatTimeLabel(slot.time)} · {party}{" "}
            {party === 1 ? "guest" : "guests"}
            <br />
            {restaurant.name} · {name}
          </p>
          <div className="mt-6">
            <Button fullWidth size="lg" onClick={confirm}>
              Confirm booking
            </Button>
            <button
              onClick={() => {
                setPhase("pick");
                setSlot(null);
                track("booking_dropoff", {
                  restaurant_id: restaurant.id,
                  claim_status: "claimed",
                  exit_point: "hold_screen",
                });
              }}
              className="mt-3 text-[14px] font-semibold text-stone-500"
            >
              Release hold
            </button>
          </div>
        </div>
      )}

      {phase === "done" && reservation && (
        <div className="mt-10 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/40">
            <span className="text-3xl text-emerald-300">✓</span>
          </div>
          <h2 className="mt-4 text-[22px] font-extrabold text-white">
            You&apos;re booked!
          </h2>
          <p className="mt-2 text-[15px] leading-7 text-stone-300">
            {formatDate(reservation.date)} ·{" "}
            {formatTimeLabel(reservation.time)}
            <br />
            {reservation.partySize}{" "}
            {reservation.partySize === 1 ? "guest" : "guests"} ·{" "}
            {restaurant.name}
          </p>
          <p className="mt-3 text-[13px] text-stone-500">
            Booking ref {reservation.id.toUpperCase()} · confirmation sent to{" "}
            {reservation.dinerContact}
          </p>
          <p className="mt-2 text-[13px] font-semibold text-amber-300">
            +100 Anli points earned 🎉
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link href="/bookings">
              <Button fullWidth variant="secondary">
                View my bookings
              </Button>
            </Link>
            {!user && (
              <Link href="/login">
                <Button fullWidth variant="secondary">
                  Sign in to keep your points
                </Button>
              </Link>
            )}
            <Link href="/">
              <Button fullWidth variant="secondary">
                Back to discovery
              </Button>
            </Link>
          </div>
        </div>
      )}

      {phase === "failed" && (
        <div className="mt-10 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30">
            <span className="text-3xl text-red-300">!</span>
          </div>
          <h2 className="mt-4 text-[20px] font-extrabold text-white">
            Couldn&apos;t complete booking
          </h2>
          <p className="mt-2 text-[14px] text-stone-400">{failReason}</p>
          <div className="mt-6">
            <Button
              fullWidth
              onClick={() => {
                setPhase("pick");
                setSlot(null);
                setFailReason("");
              }}
            >
              Pick a new slot
            </Button>
          </div>
        </div>
      )}

      <div className="h-6" />
    </div>
  );
}
