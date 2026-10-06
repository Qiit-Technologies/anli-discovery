"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authEnabled, useAuth } from "@/lib/auth";

type Mode = "signin" | "signup" | "otp";

const inputCls =
  "h-12 w-full rounded-2xl border border-ink-700 bg-ink-850 px-4 text-[15px] text-stone-100 placeholder:text-stone-600 outline-none focus:border-brand-500";

export default function LoginPage() {
  const router = useRouter();
  const { user, ready, login, register, verifyOtp, resendOtp } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  if (ready && user) {
    router.replace("/profile");
    return null;
  }

  if (!authEnabled()) {
    return (
      <div className="mx-auto w-full max-w-md px-4 pt-10">
        <div className="rounded-3xl border border-ink-800 bg-ink-900 p-6 text-center">
          <p className="font-bold text-stone-200">Accounts are offline</p>
          <p className="mt-2 text-[14px] text-stone-500">
            Sign-in needs the Anli backend. You can still browse and book as a
            guest.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-full bg-brand-500 px-6 py-2.5 text-[14px] font-bold text-white"
          >
            Back to discover
          </Link>
        </div>
      </div>
    );
  }

  async function run(fn: () => Promise<void>, ok?: () => void) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      ok?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const doLogin = () =>
    run(() => login(email.trim(), password), () => router.push("/profile"));

  const doRegister = () =>
    run(
      () =>
        register({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phoneNumber: phone.trim(),
          password,
        }),
      () => {
        setNotice("We sent a verification code to your email.");
        setMode("otp");
      },
    );

  const doVerify = () =>
    run(() => verifyOtp(email.trim(), code.trim()), () =>
      router.push("/profile"),
    );

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-8">
      <h1 className="text-[24px] font-extrabold tracking-tight text-white">
        {mode === "otp" ? "Check your email" : "Your Anli account"}
      </h1>
      <p className="mt-1 text-[14px] text-stone-400">
        {mode === "otp"
          ? "Enter the 6-digit code we sent you."
          : "Sign in to earn points, track bookings and book faster."}
      </p>

      {mode !== "otp" && (
        <div className="mt-5 grid grid-cols-2 rounded-2xl bg-ink-900 p-1">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError("");
              }}
              className={`rounded-xl py-2.5 text-[14px] font-bold ${
                mode === m ? "bg-ink-700 text-white" : "text-stone-500"
              }`}
            >
              {m === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3">
        {mode === "signup" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className={inputCls}
                autoComplete="given-name"
              />
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className={inputCls}
                autoComplete="family-name"
              />
            </div>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              className={inputCls}
              inputMode="tel"
              autoComplete="tel"
            />
          </>
        )}
        {mode !== "otp" && (
          <>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className={inputCls}
              inputMode="email"
              autoComplete="email"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                mode === "signup" ? "Create a password" : "Your password"
              }
              type="password"
              className={inputCls}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
            />
          </>
        )}
        {mode === "otp" && (
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="6-digit code"
            className={`${inputCls} text-center text-[20px] font-extrabold tracking-[0.5em]`}
            inputMode="numeric"
            maxLength={6}
          />
        )}

        {error && (
          <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-[13px] font-medium text-red-300">
            {error}
          </p>
        )}
        {notice && (
          <p className="rounded-2xl bg-brand-500/10 px-4 py-3 text-[13px] font-medium text-brand-300">
            {notice}
          </p>
        )}

        {mode === "signin" && (
          <button
            onClick={doLogin}
            disabled={busy || !email || !password}
            className="h-12 rounded-2xl bg-brand-500 text-[15px] font-bold text-white disabled:opacity-40"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        )}
        {mode === "signup" && (
          <button
            onClick={doRegister}
            disabled={
              busy || !firstName || !lastName || !email || !phone || !password
            }
            className="h-12 rounded-2xl bg-brand-500 text-[15px] font-bold text-white disabled:opacity-40"
          >
            {busy ? "Creating account…" : "Create account"}
          </button>
        )}
        {mode === "otp" && (
          <>
            <button
              onClick={doVerify}
              disabled={busy || code.length < 4}
              className="h-12 rounded-2xl bg-brand-500 text-[15px] font-bold text-white disabled:opacity-40"
            >
              {busy ? "Verifying…" : "Verify & sign in"}
            </button>
            <button
              onClick={() =>
                run(() => resendOtp(email.trim()), () =>
                  setNotice("A new code is on its way."),
                )
              }
              disabled={busy}
              className="text-[14px] font-semibold text-brand-300"
            >
              Resend code
            </button>
          </>
        )}
      </div>

      <p className="mt-6 text-center text-[12px] text-stone-600">
        Earn 100 points per confirmed booking · 25 per request
      </p>
      <div className="h-8" />
    </div>
  );
}
