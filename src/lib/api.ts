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

interface ApiHotel {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  coverImage: string | null;
  images?: string[] | null;
  restaurantLogo?: string | null;
  rating: string | number;
  ratingCount: number;
  services: string;
}

interface ApiScrapedEntry {
  id: number;
  name: string;
  address: string | null;
  coverImage: string | null;
  images: string[] | null;
  rating: string | number | null;
  ratingCount: number | null;
  tags: string | null;
  displayHours: string | null;
  isBookable: boolean;
  isScraped: boolean;
  headline: string | null;
  description: string | null;
  website: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  city: string | null;
  neighborhood: string | null;
  priceLevel: string | null;
  averageCostForTwo: string | number | null;
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

/** In-memory cache of featured partners so detail pages resolve them. */
let featuredCache: Restaurant[] | null = null;

/** Map a main (hotel) restaurant to the frontend shape. */
function mapHotel(h: ApiHotel): Restaurant {
  const slug = `hotel-${h.id}`;
  // Image keys, in priority order: coverImage -> first gallery image -> logo.
  const image =
    h.coverImage ?? h.images?.[0] ?? h.restaurantLogo ?? undefined;
  return {
    id: slug,
    slug,
    name: h.name,
    cuisine: "Restaurant",
    area: h.state || "",
    city: h.city as Restaurant["city"],
    claimStatus: "claimed" as const,
    opsSetupComplete: true,
    priceTier: 2 as const,
    priceRangeKobo: [0, 0] as [number, number],
    rating: Number(h.rating) || 0,
    reviewCount: h.ratingCount ?? 0,
    address: h.address ?? "",
    hours: "",
    description: "",
    tags: (h.services ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    maxPartySize: 8,
    hue: hueFor(slug),
    coverImage: image,
  };
}

/** City centroids for the nearby endpoint. */
const CITY_COORDS: Record<string, [number, number]> = {
  Lagos: [6.5244, 3.3792],
  Abuja: [9.0579, 7.4951],
  "Port Harcourt": [4.8156, 7.0498],
  Kano: [12.0022, 8.592],
  Ibadan: [7.3775, 3.947],
};

/**
 * Nearby mains + scraped — GET /hotels/mobile/search?lat=&lng= (public).
 * Returns a bare array mixing Hotel entities and normalized scraped
 * entries (flagged isScraped).
 */
async function fetchNearby(
  lat: number,
  lng: number,
): Promise<Restaurant[]> {
  if (!apiEnabled()) return [];
  try {
    const list = await req<
      Array<ApiHotel & Partial<ApiScrapedEntry> & { isScraped?: boolean }>
    >(`/hotels/mobile/search?lat=${lat}&lng=${lng}`);
    return (list ?? []).map((e) =>
      e.isScraped ? mapScraped(e as ApiScrapedEntry) : mapHotel(e as ApiHotel),
    );
  } catch {
    return [];
  }
}

/**
 * Full hotel-side search — GET /hotels/mobile/search?q= (public).
 * Returns { hotels, total } mixing mains and scraped (isScraped flag).
 */
async function searchHotels(q: string, limit = 20): Promise<Restaurant[]> {
  if (!apiEnabled() || !q.trim()) return [];
  try {
    const data = await req<{
      hotels: Array<ApiHotel & Partial<ApiScrapedEntry> & { isScraped?: boolean }>;
      total: number;
    }>(
      `/hotels/mobile/search?q=${encodeURIComponent(q.trim())}&limit=${Math.min(50, Math.max(1, limit))}`,
    );
    return (data.hotels ?? []).map((e) =>
      e.isScraped ? mapScraped(e as ApiScrapedEntry) : mapHotel(e as ApiHotel),
    );
  } catch {
    return [];
  }
}

/** Scraped detail — GET /hotels/scraped-restaurants/:id (public). */
async function fetchScrapedDetail(
  numericId: number,
): Promise<Restaurant | undefined> {
  if (!apiEnabled()) return undefined;
  try {
    const entry = await req<ApiScrapedEntry>(
      `/hotels/scraped-restaurants/${numericId}`,
    );
    if (!entry || !entry.id) return undefined;
    return mapScraped(entry);
  } catch {
    return undefined;
  }
}

/** Main restaurant detail — GET /hotels/hotel/:id (public). */
async function fetchHotelDetail(
  numericId: number,
): Promise<Restaurant | undefined> {
  if (!apiEnabled()) return undefined;
  try {
    const h = await req<ApiHotel>(`/hotels/hotel/${numericId}`);
    if (!h || !h.id) return undefined;
    return mapHotel(h);
  } catch {
    return undefined;
  }
}

/**
 * Featured Anli partner restaurants — GET /hotels/mobile/featured.
 * These are main (claimed) restaurants; they render as a showcase section
 * and resolve on detail pages via the cache. No mock fallback: an empty
 * list simply hides the section.
 */
export async function fetchFeatured(): Promise<Restaurant[]> {
  if (featuredCache) return featuredCache;
  if (!apiEnabled()) {
    featuredCache = [];
    return featuredCache;
  }
  try {
    const hotels = await req<ApiHotel[]>(`/hotels/mobile/featured`);
    featuredCache = hotels.map((h) => ({ ...mapHotel(h), featured: true }));
  } catch {
    featuredCache = [];
  }
  return featuredCache;
}

export interface RestaurantFilters {
  q?: string;
  city?: string;
  cuisine?: string;
  limit?: number;
}

/** Map a backend scraped entry to the frontend Restaurant shape. */
function mapScraped(e: ApiScrapedEntry): Restaurant {
  const tags = (e.tags ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const tierFromLevel = (e.priceLevel ?? "").replace(/[^$]/g, "").length;
  const slug = `scraped-${e.id}`;
  return {
    id: slug,
    slug,
    name: e.name || "Unnamed Restaurant",
    cuisine: tags[0] ?? "Restaurant",
    area: e.neighborhood ?? "",
    city: (e.city ?? "") as Restaurant["city"],
    claimStatus: "unclaimed",
    opsSetupComplete: false,
    isScraped: true,
    priceTier: (tierFromLevel >= 3 ? 3 : tierFromLevel <= 1 ? 1 : 2) as
      | 1
      | 2
      | 3,
    priceRangeKobo: [0, 0],
    rating: Number(e.rating ?? 4) || 4,
    reviewCount: Number(e.ratingCount ?? 0),
    phone: e.contactPhone ?? undefined,
    whatsapp: e.contactPhone ?? undefined,
    address: e.address ?? "",
    hours: e.displayHours ?? "",
    description: e.description ?? e.headline ?? "",
    tags,
    maxPartySize: 8,
    hue: hueFor(slug),
    coverImage: e.coverImage ?? e.images?.[0] ?? undefined,
  };
}

function filterMock(filters: RestaurantFilters): Restaurant[] {
  const q = (filters.q ?? "").trim().toLowerCase();
  const limit = filters.limit ?? 100;
  return RESTAURANTS.filter((r) => {
    if (filters.city && r.city !== filters.city) return false;
    if (filters.cuisine && filters.cuisine !== "All") {
      const hay = `${r.cuisine} ${r.tags.join(" ")}`.toLowerCase();
      if (!hay.includes(filters.cuisine.toLowerCase())) return false;
    }
    if (
      q &&
      !`${r.name} ${r.cuisine} ${r.area} ${r.tags.join(" ")}`
        .toLowerCase()
        .includes(q)
    )
      return false;
    return true;
  }).slice(0, limit);
}

/**
 * FR-01: full catalogue — aggregates EVERY live source:
 *  1. /discovery/restaurants (Anli discovery catalogue)
 *  2. /hotels/mobile/featured (Anli main/partner restaurants)
 *  3. /hotels/mobile/search?lat=&lng= (nearby mains + scraped)
 *  4. /hotels/mobile/search?q= (mains + scraped, when searching)
 * De-duplicated by name; bundled mock data is the offline fallback.
 */
export async function fetchRestaurants(
  filters: RestaurantFilters = {},
): Promise<Restaurant[]> {
  if (!apiEnabled()) return filterMock(filters);

  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.city) params.set("city", filters.city);
  if (filters.cuisine) params.set("cuisine", filters.cuisine);
  params.set("limit", String(limit));

  // 1) Discovery catalogue (never throws — falls back to [] per-source).
  const discoveryP = req<ApiRestaurant[]>(`/discovery/restaurants?${params}`)
    .then((list) => list.map(mapRestaurant))
    .catch(() => [] as Restaurant[]);

  // 2-4) Hotel-side sources.
  let extraP: Promise<Restaurant[]> = Promise.resolve([]);
  if (filters.q) {
    extraP = searchHotels(filters.q, limit);
  } else {
    // Browse: featured mains + nearby mains/scraped around every covered
    // city (or just the filtered city), all in parallel.
    const cities = filters.city ? [filters.city] : Object.keys(CITY_COORDS);
    const nearbyP = Promise.all(
      cities.map((c) => {
        const [lat, lng] = CITY_COORDS[c] ?? CITY_COORDS.Lagos;
        return fetchNearby(lat, lng).catch(() => [] as Restaurant[]);
      }),
    ).then((lists) => lists.flat());
    extraP = Promise.all([
      fetchFeatured().catch(() => [] as Restaurant[]),
      nearbyP,
    ]).then(([featured, nearby]) => [...featured, ...nearby]);
  }

  const [discoveries, extras] = await Promise.all([discoveryP, extraP]);

  const merged = [...discoveries];
  const seen = new Set(merged.map((r) => r.name.toLowerCase().trim()));
  for (const r of extras) {
    const key = r.name.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(r);
    }
  }

  // Unfiltered browse with nothing live anywhere: bundled catalogue.
  if (merged.length === 0 && !filters.q && !filters.cuisine && !filters.city) {
    return filterMock(filters);
  }
  return merged;
}

/** FR-02: listing detail incl. claim status (featured partners via cache). */
export async function fetchRestaurant(
  slug: string,
): Promise<Restaurant | undefined> {
  // Scraped listings resolve through their own public endpoint.
  const scrapedMatch = /^scraped-(\d+)$/.exec(slug);
  if (scrapedMatch) {
    return (
      (await fetchScrapedDetail(parseInt(scrapedMatch[1], 10))) ??
      mockGetRestaurant(slug)
    );
  }
  // Main (hotel) restaurants resolve via the public hotel endpoint,
  // falling back to the featured cache.
  const hotelMatch = /^hotel-(\d+)$/.exec(slug);
  if (hotelMatch) {
    return (
      (await fetchHotelDetail(parseInt(hotelMatch[1], 10))) ??
      (await fetchFeatured()).find((r) => r.slug === slug) ??
      mockGetRestaurant(slug)
    );
  }
  if (!apiEnabled()) {
    return (
      mockGetRestaurant(slug) ??
      (await fetchFeatured()).find((r) => r.slug === slug)
    );
  }
  try {
    return mapRestaurant(
      await req<ApiRestaurant>(
        `/discovery/restaurants/${encodeURIComponent(slug)}`,
      ),
    );
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      const featured = await fetchFeatured();
      const hit = featured.find((r) => r.slug === slug);
      if (hit) return hit;
      return undefined;
    }
    return (
      mockGetRestaurant(slug) ??
      (await fetchFeatured()).find((r) => r.slug === slug)
    );
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
  // Aggregated (scraped) listings go through the backend's own public
  // reservation-request endpoint, which notifies the restaurant.
  if (restaurant.isScraped && apiEnabled()) {
    const numericId = parseInt(restaurant.slug.replace("scraped-", ""), 10);
    if (!Number.isNaN(numericId)) {
      try {
        const looksEmail = /.+@.+\..+/.test(input.dinerContact);
        await req<{ success: boolean; message: string }>(
          `/hotels/scraped-restaurants/${numericId}/reservation`,
          {
            method: "POST",
            body: JSON.stringify({
              customerName: input.dinerName,
              customerEmail: looksEmail ? input.dinerContact : "",
              customerPhone: looksEmail ? "" : input.dinerContact,
              date: input.requestedAt.slice(0, 10),
              time: input.requestedAt.slice(11, 16),
              guestCount: input.partySize,
              reservationType: "ANLI Discovery",
            }),
          },
        );
        const now = new Date().toISOString();
        return {
          id: `scraped-req-${Date.now().toString(36)}`,
          restaurantId: restaurant.id,
          dinerName: input.dinerName,
          dinerContact: input.dinerContact,
          requestedAt: input.requestedAt,
          partySize: input.partySize,
          status: "open",
          createdAt: now,
        };
      } catch (e) {
        if (e instanceof ApiError) throw new Error(e.message);
        // offline: fall through to the local mock store below
      }
    }
  }
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
