import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-ink-950">
      <header className="sticky top-0 z-40 border-b border-ink-800 bg-ink-950/90 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-4">
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
          <button className="flex items-center gap-1.5 rounded-full border border-ink-700 bg-ink-900 px-3 py-1.5 text-[13px] font-medium text-stone-300">
            <span aria-hidden>📍</span> Lagos
            <span aria-hidden className="text-stone-600">▾</span>
          </button>
        </div>
      </header>

      <main className="flex-1 pb-24">{children}</main>

      <nav className="fixed bottom-0 z-40 w-full max-w-lg border-t border-ink-800 bg-ink-950/95 backdrop-blur">
        <div className="grid grid-cols-3 px-6 py-2">
          {[
            { href: "/", icon: "🔍", label: "Discover" },
            { href: "/#", icon: "🎟️", label: "Bookings" },
            { href: "/#", icon: "👤", label: "Profile" },
          ].map((item, i) => (
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
    </div>
  );
}
