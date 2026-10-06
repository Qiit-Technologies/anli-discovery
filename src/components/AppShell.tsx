"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { locationLabel, useLocation } from "@/lib/location";

const CITIES = ["Lagos", "Abuja", "Port Harcourt", "Kano", "Ibadan"];

const NAV = [
  { href: "/", icon: "🔍", label: "Discover" },
  { href: "/bookings", icon: "🎟️", label: "Bookings" },
  { href: "/profile", icon: "👤", label: "Profile" },
];

function LocationSheet({ onClose }: { onClose: () => void }) {
  const { location, setLocation, nearbyStatus, requestNearby } = useLocation();
  // Close the sheet once "Near me" resolves (but not if it was already set).
  const wasNearby = useRef(location.kind === "nearby");
  useEffect(() => {
    if (location.kind === "nearby" && !wasNearby.current) onClose();
  }, [location.kind, onClose]);

  const pick = (city: string | null) => {
    setLocation(city ? { kind: "city", city } : { kind: "all" });
    onClose();
  };

  const isActive = (city: string | null) =>
    city === null
      ? location.kind === "all"
      : location.kind === "city" && location.city === city;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <button
        aria-label="Close location picker"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
      />
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-lg rounded-t-3xl border-t border-ink-700 bg-ink-900 p-5 pb-8 sm:inset-0 sm:m-auto sm:h-fit sm:max-w-sm sm:rounded-3xl sm:border">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[17px] font-extrabold text-white">
            Choose location
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full bg-ink-800 px-3 py-1.5 text-[13px] font-semibold text-stone-400"
          >
            ✕
          </button>
        </div>

        <button
          onClick={() => {
            requestNearby();
          }}
          className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left ${
            location.kind === "nearby"
              ? "border-brand-500 bg-brand-500/10"
              : "border-ink-700 bg-ink-850"
          }`}
        >
          <span className="text-xl" aria-hidden>
            📍
          </span>
          <span className="flex-1">
            <span className="block text-[15px] font-bold text-stone-100">
              Near me
            </span>
            <span className="block text-[12px] text-stone-500">
              {nearbyStatus === "locating"
                ? "Locating…"
                : nearbyStatus === "error"
                  ? "Couldn't get your location — check permission"
                  : "Use your current location"}
            </span>
          </span>
          {location.kind === "nearby" && (
            <span className="text-brand-400" aria-hidden>
              ✓
            </span>
          )}
        </button>

        <p className="mt-4 mb-2 text-[12px] font-semibold tracking-wide text-stone-500 uppercase">
          Cities
        </p>
        <div className="flex flex-col gap-2">
          {CITIES.map((city) => (
            <button
              key={city}
              onClick={() => pick(city)}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left ${
                isActive(city)
                  ? "border-brand-500 bg-brand-500/10"
                  : "border-ink-700 bg-ink-850"
              }`}
            >
              <span className="text-[15px] font-semibold text-stone-100">
                {city}
              </span>
              {isActive(city) && (
                <span className="text-brand-400" aria-hidden>
                  ✓
                </span>
              )}
            </button>
          ))}
          <button
            onClick={() => {
              pick(null);
            }}
            className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left ${
              isActive(null)
                ? "border-brand-500 bg-brand-500/10"
                : "border-ink-700 bg-ink-850"
            }`}
          >
            <span className="text-[15px] font-semibold text-stone-100">
              🌍 All Nigeria
            </span>
            {isActive(null) && (
              <span className="text-brand-400" aria-hidden>
                ✓
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { location } = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-ink-950 md:max-w-4xl lg:max-w-6xl">
      <header className="sticky top-0 z-40 border-b border-ink-800 bg-ink-950/90 backdrop-blur">
        <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/anli-logo.jpg"
              alt="Anli"
              width={36}
              height={36}
              className="rounded-xl"
              priority
            />
            <div className="leading-tight">
              <p className="text-[17px] font-extrabold tracking-tight text-white">
                Anli <span className="text-brand-500">Diner</span>
              </p>
              <p className="text-[11px] font-medium text-stone-500">
                Find it. Book it. Eat.
              </p>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item, i) => (
              <Link
                key={item.label}
                href={item.href}
                className={`rounded-full px-4 py-2 text-[14px] font-semibold ${
                  i === 0
                    ? "bg-ink-800 text-white"
                    : "text-stone-400 hover:text-stone-200"
                }`}
              >
                <span aria-hidden className="mr-1.5">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            ))}
          </nav>

          <button
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-ink-700 bg-ink-900 px-3 py-1.5 text-[13px] font-medium text-stone-300 transition-colors hover:border-ink-500"
          >
            <span aria-hidden>📍</span>
            <span className="max-w-24 truncate">{locationLabel(location)}</span>
            <span aria-hidden className="text-stone-600">
              ▾
            </span>
          </button>
        </div>
      </header>

      <main className="flex-1 pb-24 md:pb-12">{children}</main>

      {/* Bottom tab bar — mobile only; desktop uses the header nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-800 bg-ink-950/95 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-3 px-6 py-2">
          {NAV.map((item, i) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium ${
                i === 0 ? "text-brand-400" : "text-stone-500"
              }`}
            >
              <span className="text-xl" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>

      {sheetOpen && <LocationSheet onClose={() => setSheetOpen(false)} />}
    </div>
  );
}
