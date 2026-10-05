/** Nigerian-locale formatting helpers (FRD §9: localization). */

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

/** 850000 (kobo) -> "₦8,500" */
export function formatNaira(kobo: number): string {
  return naira.format(kobo / 100);
}

/** [800000, 1500000] -> "₦8,000 – ₦15,000" */
export function formatPriceRange([low, high]: [number, number]): string {
  return `${formatNaira(low)} – ${formatNaira(high)}`;
}

/** 2 -> "₦₦" + muted rest */
export function priceTierSymbols(tier: 1 | 2 | 3): string {
  return "₦".repeat(tier);
}

/** "2026-10-08" -> "Thu, 8 Oct 2026" */
export function formatDate(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  return d.toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "2026-10-08" -> "Thu 8 Oct" (compact, for pickers) */
export function formatDateShort(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  return d.toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** "19:30" -> "7:30 PM" */
export function formatTimeLabel(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Next 14 days as YYYY-MM-DD */
export function nextDays(count = 14): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/** Normalize to +234… for tel:/wa.me links */
export function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("234")) return "+" + digits;
  if (digits.startsWith("0")) return "+234" + digits.slice(1);
  return "+" + digits;
}

/** Masked contact for privacy-aware display, e.g. "0803 ••• ••21" */
export function maskContact(contact: string): string {
  const digits = contact.replace(/\D/g, "");
  if (digits.length < 4) return "••••";
  return `${digits.slice(0, 4)} ••• ••${digits.slice(-2)}`;
}
