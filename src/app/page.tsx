"use client";

import { useMemo, useState } from "react";
import { RESTAURANTS } from "@/lib/data";
import { RestaurantCard } from "@/components/RestaurantCard";
import { track } from "@/lib/analytics";

const CUISINES = ["All", "Nigerian", "Seafood", "Asian", "Italian", "Café", "Grill", "Turkish"];
const CITIES = ["All cities", "Lagos", "Abuja", "Port Harcourt", "Kano", "Ibadan"];

function matchesCuisine(r: (typeof RESTAURANTS)[number], c: string): boolean {
  if (c === "All") return true;
  const hay = `${r.cuisine} ${r.tags.join(" ")}`.toLowerCase();
  return hay.includes(c.toLowerCase());
}

export default function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [cuisine, setCuisine] = useState("All");
  const [city, setCity] = useState("All cities");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RESTAURANTS.filter(
      (r) =>
        (city === "All cities" || r.city === city) &&
        matchesCuisine(r, cuisine) &&
        (!q ||
          `${r.name} ${r.cuisine} ${r.area} ${r.tags.join(" ")}`
            .toLowerCase()
            .includes(q)),
    );
  }, [query, cuisine, city]);

  return (
    <div className="px-4 pt-5">
      <h1 className="text-[26px] font-extrabold tracking-tight text-white">
        Where to tonight?
      </h1>
      <p className="mt-1 text-[14px] text-stone-400">
        Instant booking at claimed spots, requests everywhere else.
      </p>

      {/* Search */}
      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-ink-700 bg-ink-900 px-4 focus-within:border-brand-500">
        <span aria-hidden className="text-stone-500">🔍</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search restaurants, cuisines, areas…"
          className="h-12 w-full bg-transparent text-[15px] text-stone-100 placeholder:text-stone-600 outline-none"
        />
      </div>

      {/* City select */}
      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
        {CITIES.map((c) => (
          <button
            key={c}
            onClick={() => setCity(c)}
            className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${
              city === c
                ? "bg-brand-500 text-white"
                : "border border-ink-700 bg-ink-900 text-stone-400"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Cuisine chips */}
      <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
        {CUISINES.map((c) => (
          <button
            key={c}
            onClick={() => setCuisine(c)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              cuisine === c
                ? "bg-stone-100 text-ink-950"
                : "bg-ink-850 text-stone-400 border border-ink-800"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Results — FR-01 */}
      <div className="mt-5 flex flex-col gap-4">
        {results.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-ink-600 bg-ink-900 px-6 py-12 text-center">
            <p className="text-3xl" aria-hidden>🍽️</p>
            <p className="mt-3 font-bold text-stone-200">No matches found</p>
            <p className="mt-1 text-[14px] text-stone-500">
              Try a different search or clear your filters.
            </p>
            <button
              onClick={() => {
                setQuery("");
                setCuisine("All");
                setCity("All cities");
              }}
              className="mt-4 rounded-full bg-ink-800 px-5 py-2.5 text-[14px] font-semibold text-brand-300"
            >
              Clear filters
            </button>
          </div>
        ) : (
          results.map((r) => (
            <div
              key={r.id}
              onClick={() =>
                track("booking_attempt_started", {
                  restaurant_id: r.id,
                  claim_status: r.claimStatus,
                })
              }
            >
              <RestaurantCard restaurant={r} />
            </div>
          ))
        )}
      </div>

      <p className="mt-6 text-center text-[12px] text-stone-600">
        {results.length} spot{results.length === 1 ? "" : "s"} · Prices in NGN
      </p>
    </div>
  );
}
