"use client";

import { useState } from "react";
import Link from "next/link";
import { resendClaimOtp, submitClaim, verifyClaimOtp } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Restaurant } from "@/lib/types";

type Phase = "form" | "otp" | "done";

const ROLES = [
  { value: "owner", label: "Owner" },
  { value: "manager", label: "Manager" },
  { value: "staff", label: "Staff" },
  { value: "other", label: "Other" },
] as const;

export function ClaimFlow({ restaurant }: { restaurant: Restaurant }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]["value"]>("owner");
  const [message, setMessage] = useState("");
  const [otp, setOtp] = useState("");
  const [claimId, setClaimId] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("form");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);

  function validate(): boolean {
    if (name.trim().length < 2) {
      setError("Please enter your full name.");
      return false;
    }
    if (phone.trim().length < 7) {
      setError("Please enter a valid phone number.");
      return false;
    }
    if (!/.+@.+\..+/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return false;
    }
    return true;
  }

  async function submit() {
    setError("");
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await submitClaim(restaurant.slug, {
        claimantName: name.trim(),
        claimantPhone: phone.trim(),
        claimantEmail: email.trim(),
        role,
        message: message.trim() || undefined,
      });
      setClaimId(res.id);
      setPhase("otp");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit the claim.");
    } finally {
      setSubmitting(false);
    }
  }

  async function verify() {
    setError("");
    if (otp.trim().length < 4) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    if (claimId == null) return;
    setSubmitting(true);
    try {
      await verifyClaimOtp(claimId, otp.trim());
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function resend() {
    if (claimId == null) return;
    setError("");
    try {
      await resendClaimOtp(claimId);
      setResent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not resend the code.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href={`/restaurants/${restaurant.slug}`}
        className="text-[13px] font-semibold text-stone-400 hover:text-white"
      >
        ← Back to {restaurant.name}
      </Link>

      <h1 className="mt-4 text-[26px] font-black text-white">
        Claim {restaurant.name}
      </h1>
      <p className="mt-1 text-[14px] text-stone-400">
        Tell us who you are. We&apos;ll email you a verification code, then
        our team reviews the claim — usually within one business day.
      </p>

      {phase === "form" && (
        <div className="mt-6 flex flex-col gap-4 rounded-3xl border border-ink-800 bg-ink-900 p-5">
          <Input
            label="Your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Adaeze Okafor"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0803 000 0000"
              inputMode="tel"
            />
            <Input
              label="Business email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@restaurant.com"
              inputMode="email"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-stone-300">
              Your role
            </label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${
                    role === r.value
                      ? "bg-amber-400 text-ink-950"
                      : "bg-ink-800 text-stone-300 hover:bg-ink-700"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-stone-300">
              Anything we should know?{" "}
              <span className="font-normal text-stone-500">(optional)</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="e.g. I manage the Instagram page @…"
              className="w-full rounded-2xl border border-ink-700 bg-ink-800 px-4 py-3 text-[14px] text-white placeholder:text-stone-500 focus:border-amber-400 focus:outline-none"
            />
          </div>
          {error ? <p className="text-[13px] text-red-300">{error}</p> : null}
          <Button onClick={submit} disabled={submitting} size="lg" fullWidth>
            {submitting ? "Sending code…" : "Send verification code →"}
          </Button>
          <p className="text-[12px] leading-5 text-stone-500">
            The code goes to the email above. Only someone with access to the
            business inbox can complete a claim.
          </p>
        </div>
      )}

      {phase === "otp" && (
        <div className="mt-6 flex flex-col gap-4 rounded-3xl border border-ink-800 bg-ink-900 p-5">
          <h2 className="text-[17px] font-bold text-white">
            Check your email
          </h2>
          <p className="text-[14px] text-stone-400">
            We sent a 6-digit code to{" "}
            <span className="font-semibold text-stone-200">{email}</span>.
            It expires in 10 minutes.
          </p>
          <Input
            label="Verification code"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            inputMode="numeric"
          />
          {error ? <p className="text-[13px] text-red-300">{error}</p> : null}
          <Button onClick={verify} disabled={submitting} size="lg" fullWidth>
            {submitting ? "Verifying…" : "Verify and submit claim"}
          </Button>
          <button
            onClick={resend}
            className="text-[13px] font-semibold text-amber-300 hover:text-amber-200"
          >
            {resent ? "Code re-sent ✓" : "Didn't get it? Resend code"}
          </button>
        </div>
      )}

      {phase === "done" && (
        <div className="mt-6 rounded-3xl border border-emerald-900 bg-emerald-950/40 p-6 text-center">
          <p className="text-[40px]">🎉</p>
          <h2 className="mt-2 text-[20px] font-black text-white">
            Claim submitted
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-stone-300">
            Your email is verified. Our team will review the claim for{" "}
            <span className="font-semibold text-white">{restaurant.name}</span>{" "}
            and notify you at{" "}
            <span className="font-semibold text-white">{email}</span> — usually
            within one business day.
          </p>
          <Link
            href={`/restaurants/${restaurant.slug}`}
            className="mt-5 inline-block"
          >
            <Button variant="secondary">Back to the listing</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
