/** Core domain types for Anli Discovery — mirrors FRD §8 data entities. */

export type ClaimStatus = "claimed" | "unclaimed";

export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  cuisine: string;
  area: string;
  city: "Lagos" | "Abuja" | "Port Harcourt" | "Kano" | "Ibadan";
  /** FRD BR-01: live booking only when claimed AND opsSetupComplete */
  claimStatus: ClaimStatus;
  opsSetupComplete: boolean;
  priceTier: 1 | 2 | 3;
  /** Typical spend per person, in kobo */
  priceRangeKobo: [number, number];
  rating: number;
  reviewCount: number;
  phone?: string;
  whatsapp?: string;
  address: string;
  hours: string;
  description: string;
  tags: string[];
  /** Max party the venue can seat in one booking */
  maxPartySize: number;
  /** Accent hue index for generated cover art */
  hue: number;
  /** True for main Anli partner restaurants (from /hotels/mobile/featured) */
  featured?: boolean;
  /** True for aggregated (scraped) listings — cf. backend isScraped flag */
  isScraped?: boolean;
  /** Cover photo URL when the backend provides one */
  coverImage?: string;
}

export interface AvailabilitySlot {
  id: string;
  time: string; // "19:30"
  label: string; // "7:30 PM"
  tablesLeft: number;
}

export type RequestStatus = "open" | "claimed" | "expired";

export interface BookingRequest {
  id: string;
  restaurantId: string;
  dinerName: string;
  dinerContact: string;
  /** ISO datetime of the requested seating */
  requestedAt: string;
  partySize: number;
  status: RequestStatus;
  createdAt: string;
}

export interface Reservation {
  id: string;
  restaurantId: string;
  dinerName: string;
  dinerContact: string;
  date: string; // YYYY-MM-DD
  time: string; // "19:30"
  partySize: number;
  holdExpiresAt: string; // ISO
  status: "held" | "confirmed";
  createdAt: string;
}

/** FRD §11 analytics events */
export type AnalyticsEvent =
  | "booking_attempt_started"
  | "booking_confirmed"
  | "booking_request_submitted"
  | "fallback_link_clicked"
  | "booking_dropoff";
