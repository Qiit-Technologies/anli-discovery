"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchFeatured, fetchRestaurants } from "@/lib/api";
import type { Restaurant } from "@/lib/types";
import { RestaurantCard } from "@/components/RestaurantCard";
import { FeaturedCard } from "@/components/FeaturedCard";
import { track } from "@/lib/analytics";

const CUISINES = ["All", "Nigerian", "Seafood", "Asian", "Italian", "Café", "Grill", "Turkish"];
const CITIES = ["All cities", "Lagos", "Abuja", "Port Harcourt", "Kano", "Ibadan"];
const PAGE_SIZE = 20;
const MAX_LIMIT = 100;

export default function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [cuisine, setCuisine] = useState("All");
  const [city, setCity] = useState("All cities");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [featured, setFeatured] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  // Debounce the search input so we don't hammer the API per keystroke.
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  // Reset pagination whenever the filters change.
  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [debouncedQuery, cuisine, city]);

  // Featured Anli partners — loaded once, shown above the listing.
  useEffect(() => {
    let cancelled = false;
    fetchFeatured().then((list) => {
      if (!cancelled) setFeatured(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // FR-01: directory listing — server-side search + "load more" pagination.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchRestaurants({
      q: debouncedQuery || undefined,
      city: city === "All cities" ? undefined : city,
      cuisine: cuisine === "All" ? undefined : cuisine,
      limit,
    })
      .then((list) => {
        if (!cancelled) setRestaurants(list);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, cuisine, city, limit]);

  const hasActiveFilters =
    debouncedQuery !== "" || cuisine !== "All" || city !== "All cities";

  // Hide the "show more" button when the last fetch returned fewer than
  // the requested limit (end of catalogue) or we're at the API max.
  const canLoadMore =
    !loading && restaurants.length >= limit && limit < MAX_LIMIT;

  const clearFilters = useMemo(
    () => () => {
      setQuery("");
      setCuisine("All");
      setCity("All cities");
    },
    [],
  );

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

      {/* Featured Anli partners */}
      {featured.length > 0 && (
        <section className="mt-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[17px] font-extrabold text-white">
              Featured Anli restaurants
            </h2>
          </div>
          <p className="mt-0.5 text-[13px] text-stone-500">
            Our partner restaurants, top-rated this week.
          </p>
          <div className="no-scrollbar -mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
            {featured.map((f) => (
              <FeaturedCard key={f.id} restaurant={f} />
            ))}
          </div>
        </section>
      )}

      {/* Results — FR-01 */}
      <div className="mt-6 flex items-baseline justify-between">
        <h2 className="text-[17px] font-extrabold text-white">
          {hasActiveFilters ? "Results" : "Discover all"}
        </h2>
        {!loading && restaurants.length > 0 && (
          <p className="text-[12px] text-stone-500">
            {restaurants.length} spot{restaurants.length === 1 ? "" : "s"}
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-4">
        {loading && restaurants.length === 0 ? (
          <div className="rounded-3xl border border-ink-800 bg-ink-900 px-6 py-12 text-center">
            <p className="text-[14px] text-stone-500">Finding spots…</p>
          </div>
        ) : restaurants.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-ink-600 bg-ink-900 px-6 py-12 text-center">
            <p className="text-3xl" aria-hidden>🍽️</p>
            <p className="mt-3 font-bold text-stone-200">No matches found</p>
            <p className="mt-1 text-[14px] text-stone-500">
              Try a different search or clear your filters.
            </p>
            <button
              onClick={clearFilters}
              className="mt-4 rounded-full bg-ink-800 px-5 py-2.5 text-[14px] font-semibold text-brand-300"
            >
              Clear filters
            </button>
          </div>
        ) : (
          restaurants.map((r) => (
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

      {/* Pagination — keep discovering the catalogue */}
      {canLoadMore && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setLimit((l) => Math.min(MAX_LIMIT, l + PAGE_SIZE))}
            className="rounded-full border border-ink-600 bg-ink-900 px-6 py-3 text-[14px] font-bold text-stone-200"
          >
            Show more restaurants →
          </button>
          <p className="mt-2 text-[12px] text-stone-600">
            Showing {restaurants.length} · scroll for more
          </p>
        </div>
      )}

      <p className="mt-6 text-center text-[12px] text-stone-600">
        Prices in NGN
      </p>
      <div className="h-6" />
    </div>
  );
}
