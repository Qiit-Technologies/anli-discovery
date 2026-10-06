/**
 * Device-local "My bookings" + loyalty points.
 *
 * The Oreon backend has no customer-linked bookings or loyalty endpoints
 * yet, so bookings made on this device are recorded locally per account
 * (keyed by customer id, or "guest") and points accrue locally too.
 * When the backend adds loyalty, this module is the seam to swap out.
 */

export interface MyBooking {
  ref: string;
  userId: string;
  kind: "reservation" | "request";
  restaurantId: string;
  restaurantSlug?: string;
  restaurantName: string;
  date: string; // YYYY-MM-DD
  time: string; // "19:30"
  partySize: number;
  status: "upcoming" | "done" | "cancelled";
  createdAt: string; // ISO
}

const BOOKINGS_KEY = "anli_my_bookings";
const POINTS_KEY = "anli_points_ledger";
const API_BASE = (process.env.NEXT_PUBLIC_DISCOVERY_API_URL ?? "").replace(
  /\/$/,
  "",
);

export const POINTS_PER_BOOKING = 100;
export const POINTS_PER_REQUEST = 25;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

function deriveStatus(b: Omit<MyBooking, "status">): MyBooking["status"] {
  if ((b as MyBooking).status === "cancelled") return "cancelled";
  const today = new Date().toISOString().slice(0, 10);
  return b.date < today ? "done" : "upcoming";
}

export function recordBooking(
  b: Omit<MyBooking, "status" | "createdAt">,
): MyBooking {
  const entry: MyBooking = {
    ...b,
    status: "upcoming",
    createdAt: new Date().toISOString(),
  };
  const all = read<MyBooking[]>(BOOKINGS_KEY, []);
  // Avoid double-recording the same ref.
  if (!all.some((x) => x.ref === entry.ref)) {
    all.push(entry);
    write(BOOKINGS_KEY, all);
  }
  awardPoints(
    b.userId,
    b.kind === "reservation" ? POINTS_PER_BOOKING : POINTS_PER_REQUEST,
  );
  return entry;
}

export function listBookings(userId: string): MyBooking[] {
  const all = read<MyBooking[]>(BOOKINGS_KEY, []).filter(
    (b) => b.userId === userId,
  );
  const withStatus = all.map((b) => ({ ...b, status: deriveStatus(b) }));
  const rank = { upcoming: 0, done: 1, cancelled: 2 } as const;
  return withStatus.sort((a, b) => {
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
    return `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`);
  });
}

export function cancelBooking(ref: string): void {
  const all = read<MyBooking[]>(BOOKINGS_KEY, []);
  const hit = all.find((b) => b.ref === ref);
  if (hit) {
    hit.status = "cancelled";
    write(BOOKINGS_KEY, all);
  }
}

/** Move bookings made as guest onto the signed-in account. */
export function migrateGuestBookings(userId: string): void {
  if (userId === "guest") return;
  const all = read<MyBooking[]>(BOOKINGS_KEY, []);
  let changed = false;
  for (const b of all) {
    if (b.userId === "guest") {
      b.userId = userId;
      changed = true;
    }
  }
  if (changed) write(BOOKINGS_KEY, all);
  // Move guest points too.
  const ledger = read<Record<string, number>>(POINTS_KEY, {});
  if (ledger["guest"]) {
    ledger[userId] = (ledger[userId] ?? 0) + ledger["guest"];
    delete ledger["guest"];
    write(POINTS_KEY, ledger);
  }
}

/* ---------------- loyalty points ---------------- */

export function getPoints(userId: string): number {
  return read<Record<string, number>>(POINTS_KEY, {})[userId] ?? 0;
}

export function awardPoints(userId: string, n: number): number {
  const ledger = read<Record<string, number>>(POINTS_KEY, {});
  ledger[userId] = (ledger[userId] ?? 0) + n;
  write(POINTS_KEY, ledger);
  return ledger[userId];
}

export interface Tier {
  name: string;
  min: number;
  nextMin: number | null;
}

const TIERS: Tier[] = [
  { name: "Foodie", min: 0, nextMin: 300 },
  { name: "Regular", min: 300, nextMin: 1000 },
  { name: "VIP", min: 1000, nextMin: null },
];

export function tierFor(points: number): {
  tier: Tier;
  progress: number; // 0..1 toward next tier
} {
  const tier =
    [...TIERS].reverse().find((t) => points >= t.min) ?? TIERS[0];
  const progress =
    tier.nextMin == null ? 1 : (points - tier.min) / (tier.nextMin - tier.min);
  return { tier, progress: Math.max(0, Math.min(1, progress)) };
}

/* ---------------- real loyalty API (Oreon) ---------------- */

export interface RealLoyaltyTx {
  id: string;
  points: number;
  type: "earn" | "redeem" | "adjust";
  reason: string | null;
  reference: string | null;
  createdAt: string;
}

export interface RealLoyaltyTier {
  id: number;
  name: string;
  minPoints: number;
  benefits?: string;
}

export interface RealLoyaltyMe {
  balance: number;
  tier: RealLoyaltyTier | null;
  tiers: RealLoyaltyTier[];
  history: RealLoyaltyTx[];
}

/**
 * Fetch the real loyalty balance from Oreon (customer JWT).
 * Returns null when the backend doesn't serve loyalty yet or the
 * request fails — callers fall back to the device-local ledger.
 */
export async function fetchLoyaltyMe(
  token: string | null,
): Promise<RealLoyaltyMe | null> {
  if (!token || !API_BASE) return null;
  try {
    const res = await fetch(`${API_BASE}/loyalty/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as RealLoyaltyMe;
  } catch {
    return null;
  }
}

/** Tier progress for a real tier list. */
export function realTierProgress(
  balance: number,
  tiers: RealLoyaltyTier[],
): number {
  const sorted = [...tiers].sort((a, b) => a.minPoints - b.minPoints);
  const idx = sorted.findIndex((t) => balance < t.minPoints);
  if (idx === -1) return 1; // top tier
  if (idx === 0) return 0;
  const prev = sorted[idx - 1];
  const next = sorted[idx];
  return Math.max(
    0,
    Math.min(1, (balance - prev.minPoints) / (next.minPoints - prev.minPoints)),
  );
}
