import type {
  AvailabilitySlot,
  BookingRequest,
  Reservation,
  Restaurant,
} from "./types";
import { formatTimeLabel } from "./format";

/**
 * Mock data layer. Mirrors the shape the real API will return so components
 * never need to change when we swap this for fetch calls (FRD §8).
 */

export const RESTAURANTS: Restaurant[] = [
  {
    id: "r-sailors",
    slug: "sailors-lounge",
    name: "Sailors Lounge",
    cuisine: "Seafood & Continental",
    area: "Lekki Phase 1",
    city: "Lagos",
    claimStatus: "claimed",
    opsSetupComplete: true,
    priceTier: 3,
    priceRangeKobo: [1500000, 3500000],
    rating: 4.6,
    reviewCount: 842,
    phone: "08034521178",
    whatsapp: "08034521178",
    address: "12B Admiralty Way, Lekki Phase 1, Lagos",
    hours: "11:00 AM – 11:00 PM daily",
    description:
      "Waterfront dining with a breezy terrace, live seafood display and a cocktail bar that stays busy till late.",
    tags: ["Waterfront", "Live music", "Outdoor seating"],
    maxPartySize: 12,
    hue: 18,
  },
  {
    id: "r-yellow-chilli",
    slug: "yellow-chilli",
    name: "Yellow Chilli",
    cuisine: "Nigerian Fusion",
    area: "Victoria Island",
    city: "Lagos",
    claimStatus: "claimed",
    opsSetupComplete: true,
    priceTier: 2,
    priceRangeKobo: [800000, 1800000],
    rating: 4.4,
    reviewCount: 1204,
    phone: "08023049876",
    whatsapp: "08023049876",
    address: "27B Adeola Odeku St, Victoria Island, Lagos",
    hours: "10:00 AM – 10:00 PM daily",
    description:
      "Modern Nigerian classics — asun crostini, ofada risotto — in a warm, art-filled room off Adeola Odeku.",
    tags: ["Date night", "Nigerian", "Art"],
    maxPartySize: 10,
    hue: 42,
  },
  {
    id: "r-shiro",
    slug: "shiro-lagos",
    name: "Shiro",
    cuisine: "Pan-Asian",
    area: "Victoria Island",
    city: "Lagos",
    claimStatus: "claimed",
    opsSetupComplete: true,
    priceTier: 3,
    priceRangeKobo: [1800000, 4000000],
    rating: 4.5,
    reviewCount: 967,
    phone: "08091124533",
    whatsapp: "08091124533",
    address: "Water Corporation Rd, Victoria Island, Lagos",
    hours: "12:00 PM – 11:00 PM daily",
    description:
      "Sleek Pan-Asian dining room and sake lounge; the robata grill is the centrepiece.",
    tags: ["Sushi", "Lounge", "Business dinner"],
    maxPartySize: 8,
    hue: 350,
  },
  {
    id: "r-kapadoccia",
    slug: "kapadoccia-abuja",
    name: "Kapadoccia",
    cuisine: "Turkish & Middle Eastern",
    area: "Maitama",
    city: "Abuja",
    claimStatus: "claimed",
    opsSetupComplete: true,
    priceTier: 2,
    priceRangeKobo: [900000, 2000000],
    rating: 4.7,
    reviewCount: 513,
    phone: "08052218904",
    whatsapp: "08052218904",
    address: "45 Gana St, Maitama, Abuja",
    hours: "11:00 AM – 10:30 PM daily",
    description:
      "Charcoal grills, cave-style interiors and proper Turkish breakfast on weekends.",
    tags: ["Family", "Grill", "Breakfast"],
    maxPartySize: 14,
    hue: 28,
  },
  {
    id: "r-jevinik",
    slug: "jevinik-ph",
    name: "Jevinik",
    cuisine: "Nigerian",
    area: "GRA Phase 2",
    city: "Port Harcourt",
    claimStatus: "unclaimed",
    opsSetupComplete: false,
    priceTier: 2,
    priceRangeKobo: [600000, 1400000],
    rating: 4.3,
    reviewCount: 689,
    phone: "08038887722",
    whatsapp: "08038887722",
    address: "18 Stadium Rd, GRA Phase 2, Port Harcourt",
    hours: "9:00 AM – 10:00 PM daily",
    description:
      "PH institution for native soups, fresh fish pepper soup and Sunday rice done properly.",
    tags: ["Local favourite", "Soups", "Family"],
    maxPartySize: 20,
    hue: 95,
  },
  {
    id: "r-gusto",
    slug: "gusto-kano",
    name: "Gusto Restaurant",
    cuisine: "Italian",
    area: "Nassarawa",
    city: "Kano",
    claimStatus: "unclaimed",
    opsSetupComplete: false,
    priceTier: 2,
    priceRangeKobo: [700000, 1600000],
    rating: 4.2,
    reviewCount: 214,
    phone: "08065432198",
    address: "7 Audu Bako Way, Nassarawa, Kano",
    hours: "12:00 PM – 10:00 PM daily",
    description:
      "Wood-fired pizzas and handmade pasta in a quiet garden setting.",
    tags: ["Pizza", "Garden", "Quiet"],
    maxPartySize: 10,
    hue: 150,
  },
  {
    id: "r-artisan61",
    slug: "artisan61-abuja",
    name: "Artisan61",
    cuisine: "Café & Brunch",
    area: "Wuse 2",
    city: "Abuja",
    claimStatus: "unclaimed",
    opsSetupComplete: false,
    priceTier: 1,
    priceRangeKobo: [350000, 800000],
    rating: 4.8,
    reviewCount: 342,
    phone: "08071234567",
    whatsapp: "08071234567",
    address: "61 Adetokunbo Ademola Cres, Wuse 2, Abuja",
    hours: "8:00 AM – 9:00 PM daily",
    description:
      "Specialty coffee, flaky pastries and the brunch queue everyone complains about lovingly.",
    tags: ["Coffee", "Brunch", "Work-friendly"],
    maxPartySize: 6,
    hue: 200,
  },
  {
    id: "r-backyard",
    slug: "the-backyard-ibadan",
    name: "The Backyard",
    cuisine: "Grill & BBQ",
    area: "Bodija",
    city: "Ibadan",
    claimStatus: "unclaimed",
    opsSetupComplete: false,
    priceTier: 1,
    priceRangeKobo: [400000, 900000],
    rating: 4.1,
    reviewCount: 187,
    phone: "08059876543",
    address: "22 Awolowo Ave, Bodija, Ibadan",
    hours: "4:00 PM – 11:00 PM daily",
    description:
      "Open-air suya spot with cold drinks, plastic chairs and zero pretence.",
    tags: ["Suya", "Outdoor", "Casual"],
    maxPartySize: 16,
    hue: 8,
  },
];

export function getRestaurant(slug: string): Restaurant | undefined {
  return RESTAURANTS.find((r) => r.slug === slug);
}

/** FRD BR-01: live booking only when claimed AND ops setup complete. */
export function isLiveBookable(r: Restaurant): boolean {
  return r.claimStatus === "claimed" && r.opsSetupComplete;
}

/** Deterministic pseudo-random from a string seed (stable mock availability). */
function seeded(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

const SLOT_TIMES = [
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
];

/** Mocked live availability (stands in for the ops module, FR-03). */
export function getAvailability(
  restaurantId: string,
  date: string,
  partySize: number,
): AvailabilitySlot[] {
  const r = RESTAURANTS.find((x) => x.id === restaurantId);
  if (!r || !isLiveBookable(r)) return [];
  return SLOT_TIMES.map((time) => {
    const rand = seeded(`${restaurantId}|${date}|${time}|${partySize}`);
    const tablesLeft = Math.floor(rand * 6); // 0–5
    return {
      id: `${date}-${time}`,
      time,
      label: formatTimeLabel(time),
      tablesLeft,
    };
  }).filter((s) => s.tablesLeft > 0 || seeded(s.id + "show") > 0.55);
}

/* ------------------------------------------------------------------ */
/* In-memory stores (per-process; replaced by the API later)           */
/* ------------------------------------------------------------------ */

const requests: BookingRequest[] = [];
const reservations: Reservation[] = [];

export function saveBookingRequest(
  input: Omit<BookingRequest, "id" | "status" | "createdAt">,
): BookingRequest {
  // FR-09 edge: flag repeat requests from the same contact to the same venue
  const duplicate = requests.some(
    (r) =>
      r.restaurantId === input.restaurantId &&
      r.dinerContact === input.dinerContact &&
      r.requestedAt === input.requestedAt,
  );
  const req: BookingRequest = {
    ...input,
    id: `req_${Date.now().toString(36)}`,
    status: "open",
    createdAt: new Date().toISOString(),
  };
  requests.push(req);
  return { ...req, ...(duplicate ? { status: "open" as const } : {}) };
}

export function getRequestsFor(restaurantId: string): BookingRequest[] {
  return requests.filter((r) => r.restaurantId === restaurantId);
}

/** FR-05: place a short-TTL hold on a slot (default 5 minutes). */
export function holdSlot(input: {
  restaurantId: string;
  dinerName: string;
  dinerContact: string;
  date: string;
  time: string;
  partySize: number;
  ttlMinutes?: number;
}): Reservation {
  const ttl = input.ttlMinutes ?? 5;
  const res: Reservation = {
    id: `res_${Date.now().toString(36)}`,
    restaurantId: input.restaurantId,
    dinerName: input.dinerName,
    dinerContact: input.dinerContact,
    date: input.date,
    time: input.time,
    partySize: input.partySize,
    holdExpiresAt: new Date(Date.now() + ttl * 60_000).toISOString(),
    status: "held",
    createdAt: new Date().toISOString(),
  };
  reservations.push(res);
  return res;
}

/** FR-06: confirm a held reservation (race-safe: fails if hold expired). */
export function confirmReservation(
  id: string,
): { ok: true; reservation: Reservation } | { ok: false; reason: string } {
  const res = reservations.find((r) => r.id === id);
  if (!res) return { ok: false, reason: "Reservation not found." };
  if (res.status === "confirmed") return { ok: true, reservation: res };
  if (new Date(res.holdExpiresAt).getTime() < Date.now()) {
    return {
      ok: false,
      reason: "This hold expired before confirmation. Please pick a new slot.",
    };
  }
  res.status = "confirmed";
  return { ok: true, reservation: res };
}

export function getReservation(id: string): Reservation | undefined {
  return reservations.find((r) => r.id === id);
}
