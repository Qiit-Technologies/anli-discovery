import type { ReactNode } from "react";

type Tone = "live" | "request" | "muted" | "warn" | "success";

const tones: Record<Tone, string> = {
  live: "bg-brand-500/15 text-brand-300 border-brand-500/30",
  request: "bg-amber-400/10 text-amber-300 border-amber-400/25",
  muted: "bg-ink-800 text-stone-400 border-ink-600",
  warn: "bg-red-500/10 text-red-300 border-red-500/25",
  success: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
};

export function Badge({
  tone = "muted",
  children,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** FRD fork badge: live booking vs request-to-book, driven by claim status. */
export function ClaimBadge({ live }: { live: boolean }) {
  return live ? (
    <Badge tone="live">
      <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" />
      Book instantly
    </Badge>
  ) : (
    <Badge tone="request">Request to book</Badge>
  );
}
