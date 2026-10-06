import type {
  AvailabilitySlot,
  BookingRequest,
  Reservation,
  Restaurant,
} from "./types";
import {
  RESTAURANTS,
  getRestaurant as mockGetRestaurant,
  getAvailability as mockGetAvailability,
  holdSlot as mockHoldSlot,
  confirmReservation as mockConfirmReservation,
  saveBookingRequest as mockSaveBookingRequest,
  getRequestsFor as mockGetRequestsFor,
} from "./data";

/**
 * API client for the Oreon discovery backend (FRD §8).
 *
 * Set NEXT_PUBLIC_DISCOVERY_API_URL to the backend origin, e.g.
 * https://oreon-api.onrender.com — the discovery routes live under
 * /discovery/... with no global prefix.
 *
 * When the variable is unset or a request fails, every call falls back
 * to the local mock layer in ./data so the app keeps working offline
 * and in previews without a backend.
 */

const API_BASE = (process.env.NEXT_PUBLIC_DISCOVERY_API_URL ?? "").replace(
  /\/$/,
  "",
);

export function apiEnabled(): boolean {
  return API_BASE.length > 0;
}

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      const m = body.message;
      message = Array.isArray(m) ? m.join("; ") : (m ?? message);
    } catch {
      /* keep default */
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

/* ---------------- backend shapes ---------------- */

interface ApiRestaurant {
  id: number;
  slug: string;
  name: string;
  cuisine: string;
  area: string;
  city: string;
  claimStatus: "claimed" | "unclaimed";
  opsSetupComplete: boolean;
  priceTier: number;
  priceLowKobo: string | number | null;
  priceHighKobo: string | number | null;
  rating: string | number;
  reviewCount: number;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  hours: string | null;
  description: string | null;
  tags: string | null;
  maxPartySize: number;
}

interface ApiAvailability {
  date: string;
  partySize: number;
  slots: { time: string; label: string; tablesLeft: number }[];
}

interface ApiHold {
  id: number;
  restaurantId: number;
  dinerName: string;
  dinerContact: string;
  date: string;
  time: string;
  partySize: number;
  expiresAt: string;
  status: "held" | "confirmed" | "expired" | "released";
  createdAt: string;
}

interface ApiBookingRequest {
  id: number;
  restaurantId: number;
  dinerName: string;
  dinerContact: string;
  requestedAt: string;
  partySize: number;
  status: "open" | "claimed" | "expired";
  createdAt: string;
}

/* ---------------- mappers ---------------- */

/** Deterministic accent hue from the slug (backend has no hue field). */
function hueFor(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) % 360;
  return h;
}

function mapRestaurant(r: ApiRestaurant): Restaurant {
  return {
    id: String(r.id),
    slug: r.slug,
    name: r.name,
    cuisine: r.cuisine,
    area: r.area,
    city: r.city as Restaurant["city"],
    claimStatus: r.claimStatus,
    opsSetupComplete: r.opsSetupComplete,
    priceTier: (r.priceTier === 1 || r.priceTier === 3 ? r.priceTier : 2) as
      | 1
      | 2
      | 3,
    priceRangeKobo: [
      Number(r.priceLowKobo ?? 0),
      Number(r.priceHighKobo ?? 0),
    ],
    rating: Number(r.rating) || 0,
    reviewCount: r.reviewCount ?? 0,
    phone: r.phone ?? undefined,
    whatsapp: r.whatsapp ?? undefined,
    address: r.address ?? "",
    hours: r.hours ?? "",
    description: r.description ?? "",
    tags: (r.tags ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    maxPartySize: r.maxPartySize ?? 8,
    hue: hueFor(r.slug),
  };
}

function mapHold(h: ApiHold): Reservation {
  return {
    id: String(h.id),
    restaurantId: String(h.restaurantId),
    dinerName: h.dinerName,
    dinerContact: h.dinerContact,
    date: h.date,
    time: h.time,
    partySize: h.partySize,
    holdExpiresAt: new Date(h.expiresAt).toISOString(),
    status: h.status === "confirmed" ? "confirmed" : "held",
    createdAt: new Date(h.createdAt).toISOString(),
  };
}

function mapBookingRequest(b: ApiBookingRequest): BookingRequest {
  return {
    id: String(b.id),
    restaurantId: String(b.restaurantId),
    dinerName: b.dinerName,
    dinerContact: b.dinerContact,
    requestedAt: new Date(b.requestedAt).toISOString(),
    partySize: b.partySize,
    status: b.status,
    createdAt: new Date(b.createdAt).toISOString(),
  };
}

/* ---------------- public API (with mock fallback) ---------------- */

/** FR-01: directory listing. Falls back to the bundled mock list. */
export async function fetchRestaurants(): Promise<Restaurant[]> {
  if (!apiEnabled()) return RESTAURANTS;
  try {
    const list = await req<ApiRestaurant[]>(
      `/discovery/restaurants?limit=100`,
    );
    return list.map(mapRestaurant);
  } catch {
    return RESTAURANTS;
  }
}

/** FR-02: listing detail incl. claim status. */
export async function fetchRestaurant(
  slug: string,
): Promise<Restaurant | undefined> {
  if (!apiEnabled()) return mockGetRestaurant(slug);
  try {
    return mapRestaurant(
      await req<ApiRestaurant>(
        `/discovery/restaurants/${encodeURIComponent(slug)}`,
      ),
    );
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return undefined;
    return mockGetRestaurant(slug);
  }
}

/** FR-03/FR-04: live availability (claimed + ops-complete only, BR-01). */
export async function fetchAvailability(
  restaurant: Restaurant,
  date: string,
  partySize: number,
): Promise<AvailabilitySlot[]> {
  if (!apiEnabled())
    return mockGetAvailability(restaurant.id, date, partySize);
  try {
    const data = await req<ApiAvailability>(
      `/discovery/restaurants/${encodeURIComponent(restaurant.slug)}/availability?date=${date}&partySize=${partySize}`,
    );
    return data.slots.map((s) => ({
      id: `${data.date}-${s.time}`,
      time: s.time,
      label: s.label,
      tablesLeft: s.tablesLeft,
    }));
  } catch (e) {
    // 403 = not live-bookable (BR-01): no live-looking slots, ever.
    if (e instanceof ApiError && e.status === 403) return [];
    return mockGetAvailability(restaurant.id, date, partySize);
  }
}

export interface HoldInput {
  dinerName: string;
  dinerContact: string;
  date: string;
  time: string;
  partySize: number;
}

/** FR-05: place a short-TTL hold on a slot. */
export async function createHold(
  restaurant: Restaurant,
  input: HoldInput,
): Promise<Reservation> {
  if (!apiEnabled())
    return mockHoldSlot({ restaurantId: restaurant.id, ...input, ttlMinutes: 5 });
  try {
    const hold = await req<ApiHold>(
      `/discovery/restaurants/${encodeURIComponent(restaurant.slug)}/holds`,
      { method: "POST", body: JSON.stringify(input) },
    );
    return mapHold(hold);
  } catch (e) {
    if (e instanceof ApiError) throw new Error(e.message);
    return mockHoldSlot({ restaurantId: restaurant.id, ...input, ttlMinutes: 5 });
  }
}

/** FR-06: race-safe confirm. Numeric ids are API holds; others are mock. */
export async function confirmHold(
  reservationId: string,
): Promise<{ ok: true; reservation: Reservation } | { ok: false; reason: string }> {
  const numericId = /^\d+$/.test(reservationId)
    ? parseInt(reservationId, 10)
    : NaN;
  if (apiEnabled() && !Number.isNaN(numericId)) {
    try {
      const hold = await req<ApiHold>(`/discovery/holds/${numericId}/confirm`, {
        method: "POST",
      });
      return { ok: true, reservation: mapHold(hold) };
    } catch (e) {
      return {
        ok: false,
        reason: e instanceof Error ? e.message : "Confirmation failed.",
      };
    }
  }
  return mockConfirmReservation(reservationId);
}

export interface BookingRequestInput {
  dinerName: string;
  dinerContact: string;
  /** ISO datetime of the requested seating */
  requestedAt: string;
  partySize: number;
}

/** FR-08–FR-11: Path B booking request at an unclaimed restaurant. */
export async function createBookingRequest(
  restaurant: Restaurant,
  input: BookingRequestInput,
): Promise<BookingRequest> {
  if (!apiEnabled())
    return mockSaveBookingRequest({ restaurantId: restaurant.id, ...input });
  try {
    const created = await req<ApiBookingRequest>(
      `/discovery/restaurants/${encodeURIComponent(restaurant.slug)}/requests`,
      { method: "POST", body: JSON.stringify(input) },
    );
    return mapBookingRequest(created);
  } catch (e) {
    if (e instanceof ApiError) throw new Error(e.message);
    return mockSaveBookingRequest({ restaurantId: restaurant.id, ...input });
  }
}

/**
 * Local demand counter for the "N requests logged" hint. The pipeline read
 * is staff-only on the API, so this only counts mock-mode requests.
 */
export function getLocalRequestCount(restaurantId: string): number {
  if (apiEnabled()) return 0;
  return mockGetRequestsFor(restaurantId).length;
}
