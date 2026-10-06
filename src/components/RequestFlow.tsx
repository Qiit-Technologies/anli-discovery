"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  createBookingRequest,
  getLocalRequestCount,
} from "@/lib/api";
import { formatDate, formatDateShort, nextDays, toE164 } from "@/lib/format";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Stepper } from "@/components/ui/Stepper";
import { displayName, useAuth } from "@/lib/auth";
import { recordBooking } from "@/lib/mybookings";
import type { BookingRequest, Restaurant } from "@/lib/types";

type Phase = "form" | "done";

export function RequestFlow({ restaurant }: { restaurant: Restaurant }) {
  const { user } = useAuth();
  const [date, setDate] = useState(nextDays()[0]);
  const [time, setTime] = useState("19:00");
  const [party, setParty] = useState(2);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [errors, setErrors] = useState<{ name?: string; contact?: string }>({});
  const [saved, setSaved] = useState<BookingRequest | null>(null);
  const [phase, setPhase] = useState<Phase>("form");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

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

  const days = nextDays(14);
  const times = ["12:00", "13:00", "14:00", "18:00", "19:00", "20:00", "21:00"];
  const demandCount = getLocalRequestCount(restaurant.id);

  async function submit() {
    const e: typeof errors = {};
    if (name.trim().length < 2) e.name = "Please enter your name.";
    if (contact.replace(/\D/g, "").length < 7)
      e.contact = "Enter a valid phone number or email.";
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSubmitting(true);
    setSubmitError("");
    try {
      // FR-08–FR-11: Path B request — live API when configured, mock fallback.
      const req = await createBookingRequest(restaurant, {
        dinerName: name.trim(),
        dinerContact: contact.trim(),
        requestedAt: `${date}T${time}:00`,
        partySize: party,
        customerId: user ? String(user.id) : undefined,
      });
      setSaved(req);
      setPhase("done");
      // Save to My bookings + award loyalty points (device-local for now).
      recordBooking({
        ref: req.id,
        userId: user ? String(user.id) : "guest",
        kind: "request",
        restaurantId: restaurant.id,
        restaurantSlug: restaurant.slug,
        restaurantName: restaurant.name,
        date,
        time,
        partySize: party,
      });
      // FR-11: logged for the Sales/Growth pipeline; FR-12: restaurant notified
      track("booking_request_submitted", {
        restaurant_id: restaurant.id,
        datetime: `${date} ${time}`,
        party_size: party,
      });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Couldn't send your request.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const waNumber = restaurant.whatsapp ? toE164(restaurant.whatsapp) : null;
  const waLink = waNumber
    ? `https://wa.me/${waNumber.replace("+", "")}?text=${encodeURIComponent(
        `Hello ${restaurant.name}! I'd like to book a table for ${party} on ${formatDate(date)} around ${time}. — via Anli Diner`,
      )}`
    : null;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-5">
      <Link
        href={`/restaurants/${restaurant.slug}`}
        className="text-[14px] font-medium text-stone-400"
      >
        ← {restaurant.name}
      </Link>
      <h1 className="mt-2 text-[24px] font-extrabold tracking-tight text-white">
        Request to book
      </h1>

      <div className="mt-4">
        <Stepper steps={["Your request", "Fallback", "Sent"]} current={phase === "form" ? 0 : 2} />
      </div>

      {phase === "form" && (
        <div className="mt-6">
          {/* FR-08 / BR-03: request ≠ confirmed table, stated plainly */}
          <div className="rounded-2xl border border-amber-400/25 bg-amber-400/5 p-4">
            <p className="text-[14px] leading-6 text-amber-200">
              <span className="font-bold">Heads up:</span> {restaurant.name}{" "}
              isn&apos;t on Anli live booking yet, so this sends a{" "}
              <span className="font-bold">request — not a confirmed table</span>.
              We&apos;ll notify the restaurant right away.
            </p>
          </div>

          <p className="mt-5 text-[13px] font-semibold text-stone-400 uppercase tracking-wide">
            Date
          </p>
          <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
            {days.map((d) => (
              <button
                key={d}
                onClick={() => setDate(d)}
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
            Time (approx.)
          </p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {times.map((t) => (
              <button
                key={t}
                onClick={() => setTime(t)}
                className={`rounded-xl border py-2.5 text-[14px] font-bold transition-colors ${
                  time === t
                    ? "border-brand-500 bg-brand-500/15 text-white"
                    : "border-ink-700 bg-ink-900 text-stone-400"
                }`}
              >
                {t}
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

          <div className="mt-5 flex flex-col gap-4">
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
              hint="The restaurant may contact you to confirm. Handled per NDPA."
              inputMode="tel"
              autoComplete="tel"
            />
          </div>

          <div className="mt-6">
            <Button fullWidth size="lg" onClick={submit} disabled={submitting}>
              {submitting ? "Sending…" : "Send booking request →"}
            </Button>
            {submitError && (
              <p className="mt-3 text-center text-[13px] text-red-300">
                {submitError}
              </p>
            )}
          </div>
        </div>
      )}

      {phase === "done" && saved && (
        <div className="mt-6">
          <div className="rounded-3xl border border-ink-700 bg-ink-900 p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-400/10 border border-amber-400/30">
              <span className="text-2xl text-amber-300">✉</span>
            </div>
            <h2 className="mt-4 text-[20px] font-extrabold text-white">
              Request sent
            </h2>
            <p className="mt-2 text-[14px] leading-6 text-stone-400">
              {formatDate(date)} · {time} · {party}{" "}
              {party === 1 ? "guest" : "guests"}
              <br />
              {restaurant.name} has been notified.
              {demandCount + 1 > 1 && (
                <span className="text-stone-500">
                  {" "}({demandCount + 1} requests logged for this spot)
                </span>
              )}
            </p>
            <p className="mt-3 rounded-xl bg-ink-850 p-3 text-[13px] font-medium text-amber-200/90">
              This is a request, not a confirmed table. Want certainty? Reach
              them directly:
            </p>
            <p className="mt-3 text-[13px] font-semibold text-amber-300">
              +25 Anli points earned 🎉
            </p>
          </div>

          {/* FR-10: call/WhatsApp fallback, right after submission */}
          <div className="mt-4 flex flex-col gap-3">
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  track("fallback_link_clicked", {
                    restaurant_id: restaurant.id,
                  })
                }
              >
                <Button fullWidth variant="whatsapp" size="lg">
                  <span aria-hidden>💬</span> WhatsApp the restaurant
                </Button>
              </a>
            )}
            {restaurant.phone && (
              <a
                href={`tel:${toE164(restaurant.phone)}`}
                onClick={() =>
                  track("fallback_link_clicked", {
                    restaurant_id: restaurant.id,
                  })
                }
              >
                <Button fullWidth variant="secondary" size="lg">
                  <span aria-hidden>📞</span> Call {restaurant.phone}
                </Button>
              </a>
            )}
          </div>

          <div className="mt-6">
            <Link href="/">
              <Button fullWidth variant="ghost">
                Back to discovery
              </Button>
            </Link>
          </div>
        </div>
      )}

      <div className="h-6" />
    </div>
  );
}
