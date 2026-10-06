"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { displayName, useAuth } from "@/lib/auth";
import {
  fetchLoyaltyMe,
  getPoints,
  listBookings,
  realTierProgress,
  tierFor,
  type RealLoyaltyMe,
} from "@/lib/mybookings";

const inputCls =
  "h-12 w-full rounded-2xl border border-ink-700 bg-ink-850 px-4 text-[15px] text-stone-100 placeholder:text-stone-600 outline-none focus:border-brand-500";

export default function ProfilePage() {
  const {
    user,
    token,
    ready,
    logout,
    updateProfile,
    changePassword,
  } = useAuth();
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const userId = user ? String(user.id) : "guest";
  const [points, setPoints] = useState(0);
  const [upcoming, setUpcoming] = useState(0);
  const [total, setTotal] = useState(0);
  const [realLoyalty, setRealLoyalty] = useState<RealLoyaltyMe | null>(null);

  useEffect(() => {
    if (!ready) return;
    setPoints(getPoints(userId));
    const all = listBookings(userId);
    setUpcoming(all.filter((b) => b.status === "upcoming").length);
    setTotal(all.length);
    // Real loyalty balance when the backend serves it.
    if (user && token) {
      fetchLoyaltyMe(token).then((me) => {
        if (me) {
          setRealLoyalty(me);
          setPoints(me.balance);
        }
      });
    } else {
      setRealLoyalty(null);
    }
  }, [ready, userId, user, token]);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? "");
      setLastName(user.lastName ?? "");
      setPhone(user.phoneNumber ?? "");
    }
  }, [user]);

  if (!ready) {
    return (
      <div className="px-4 pt-10 text-center text-[14px] text-stone-500">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-4 pt-10">
        <div className="rounded-3xl border border-ink-800 bg-ink-900 p-6 text-center">
          <p className="text-4xl" aria-hidden>
            👤
          </p>
          <p className="mt-3 text-[18px] font-extrabold text-white">
            Your profile lives here
          </p>
          <p className="mt-2 text-[14px] leading-6 text-stone-400">
            Sign in to earn loyalty points, see your bookings and manage them
            across devices.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-block rounded-full bg-brand-500 px-8 py-3 text-[15px] font-bold text-white"
          >
            Sign in / Create account
          </Link>
        </div>
      </div>
    );
  }

  const { tier, progress } = realLoyalty
    ? {
        tier: {
          name: realLoyalty.tier?.name ?? "Foodie",
          min: realLoyalty.tier?.minPoints ?? 0,
          nextMin: null as number | null,
        },
        progress: realTierProgress(points, realLoyalty.tiers),
      }
    : tierFor(points);
  const tierName = realLoyalty ? (realLoyalty.tier?.name ?? "Foodie") : tier.name;
  const nextTierName = (() => {
    if (!realLoyalty) {
      return tier.nextMin === 300 ? "Regular" : tier.nextMin === 1000 ? "VIP" : null;
    }
    const sorted = [...realLoyalty.tiers].sort(
      (a, b) => a.minPoints - b.minPoints,
    );
    const next = sorted.find((t) => points < t.minPoints);
    return next ? { name: next.name, min: next.minPoints } : null;
  })();
  const initials = displayName(user)
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function saveProfile() {
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phone.trim(),
      });
      setMsg("Profile updated.");
      setEditing(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't update profile.");
    } finally {
      setBusy(false);
    }
  }

  async function savePassword() {
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      await changePassword(oldPw, newPw);
      setMsg("Password changed.");
      setOldPw("");
      setNewPw("");
      setShowPw(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't change password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6">
      {/* Identity */}
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-500/15 text-[22px] font-black text-brand-300">
          {initials}
        </div>
        <div className="flex-1">
          <h1 className="text-[22px] font-extrabold tracking-tight text-white">
            {displayName(user)}
          </h1>
          <p className="text-[14px] text-stone-400">{user.email}</p>
        </div>
        <button
          onClick={logout}
          className="rounded-full border border-ink-700 px-4 py-2 text-[13px] font-bold text-stone-300"
        >
          Sign out
        </button>
      </div>

      {/* Points */}
      <div className="mt-5 rounded-3xl border border-amber-400/25 bg-gradient-to-br from-amber-500/15 to-transparent p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-[13px] font-semibold tracking-wide text-amber-200/80 uppercase">
            Anli points
          </p>
          <span className="rounded-full bg-amber-400/15 px-3 py-1 text-[12px] font-extrabold text-amber-300">
            {tierName}
          </span>
        </div>
        <p className="mt-2 text-[34px] font-black text-white">
          {points.toLocaleString()}
          <span className="ml-2 text-[14px] font-semibold text-stone-400">
            pts
          </span>
        </p>
        {nextTierName ? (
          <>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-700">
              <div
                className="h-full rounded-full bg-amber-400 transition-all"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-[12px] text-stone-400">
              {typeof nextTierName === "string"
                ? `${(tier.nextMin! - points).toLocaleString()} pts to ${nextTierName}`
                : `${(nextTierName.min - points).toLocaleString()} pts to ${nextTierName.name}`}
            </p>
          </>
        ) : (
          <p className="mt-2 text-[12px] text-stone-400">
            Top tier — enjoy it. 🎉
          </p>
        )}
        <p className="mt-1 text-[12px] text-stone-500">
          100 pts per confirmed booking · 25 per request
          {!realLoyalty && user && " · syncing with Anli…"}
        </p>
      </div>

      {/* Points history (real loyalty) */}
      {realLoyalty && realLoyalty.history.length > 0 && (
        <div className="mt-4 rounded-3xl border border-ink-800 bg-ink-900 p-5">
          <h2 className="text-[16px] font-extrabold text-white">
            Recent activity
          </h2>
          <div className="mt-3 flex flex-col gap-2.5">
            {realLoyalty.history.slice(0, 5).map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between text-[13px]"
              >
                <div>
                  <p className="font-semibold text-stone-200">
                    {h.reason || h.type}
                  </p>
                  <p className="text-[11px] text-stone-500">
                    {new Date(h.createdAt).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span
                  className={`font-extrabold ${h.points >= 0 ? "text-emerald-300" : "text-red-300"}`}
                >
                  {h.points >= 0 ? "+" : ""}
                  {h.points}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link
          href="/bookings"
          className="rounded-3xl border border-ink-800 bg-ink-900 p-4"
        >
          <p className="text-[24px] font-black text-white">{upcoming}</p>
          <p className="text-[13px] text-stone-500">Upcoming bookings →</p>
        </Link>
        <div className="rounded-3xl border border-ink-800 bg-ink-900 p-4">
          <p className="text-[24px] font-black text-white">{total}</p>
          <p className="text-[13px] text-stone-500">Total on this device</p>
        </div>
      </div>

      {msg && (
        <p className="mt-4 rounded-2xl bg-brand-500/10 px-4 py-3 text-[13px] font-medium text-brand-300">
          {msg}
        </p>
      )}
      {err && (
        <p className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-[13px] font-medium text-red-300">
          {err}
        </p>
      )}

      {/* Edit profile */}
      <div className="mt-4 rounded-3xl border border-ink-800 bg-ink-900 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-extrabold text-white">
            Profile details
          </h2>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-[13px] font-bold text-brand-300"
            >
              Edit
            </button>
          )}
        </div>
        {editing ? (
          <div className="mt-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className={inputCls}
              />
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className={inputCls}
              />
            </div>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              className={inputCls}
              inputMode="tel"
            />
            <div className="flex gap-2">
              <button
                onClick={saveProfile}
                disabled={busy}
                className="h-11 flex-1 rounded-2xl bg-brand-500 text-[14px] font-bold text-white disabled:opacity-40"
              >
                {busy ? "Saving…" : "Save changes"}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="h-11 rounded-2xl border border-ink-700 px-5 text-[14px] font-bold text-stone-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2 text-[14px]">
            <div className="flex justify-between">
              <span className="text-stone-500">Phone</span>
              <span className="font-semibold text-stone-200">
                {user.phoneNumber || "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Email</span>
              <span className="font-semibold text-stone-200">{user.email}</span>
            </div>
          </div>
        )}
      </div>

      {/* Change password */}
      <div className="mt-4 rounded-3xl border border-ink-800 bg-ink-900 p-5">
        {!showPw ? (
          <button
            onClick={() => setShowPw(true)}
            className="text-[14px] font-bold text-stone-200"
          >
            Change password →
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <h2 className="text-[16px] font-extrabold text-white">
              Change password
            </h2>
            <input
              value={oldPw}
              onChange={(e) => setOldPw(e.target.value)}
              placeholder="Current password"
              type="password"
              className={inputCls}
              autoComplete="current-password"
            />
            <input
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="New password"
              type="password"
              className={inputCls}
              autoComplete="new-password"
            />
            <div className="flex gap-2">
              <button
                onClick={savePassword}
                disabled={busy || !oldPw || !newPw}
                className="h-11 flex-1 rounded-2xl bg-brand-500 text-[14px] font-bold text-white disabled:opacity-40"
              >
                {busy ? "Updating…" : "Update password"}
              </button>
              <button
                onClick={() => setShowPw(false)}
                className="h-11 rounded-2xl border border-ink-700 px-5 text-[14px] font-bold text-stone-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="h-8" />
    </div>
  );
}
