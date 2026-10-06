import Link from "next/link";
import type { Restaurant } from "@/lib/types";
import { formatPriceRange, priceTierSymbols } from "@/lib/format";
import { isLiveBookable } from "@/lib/data";
import { ClaimBadge } from "./ui/Badge";

export function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  const live = isLiveBookable(restaurant);
  return (
    <Link
      href={`/restaurants/${restaurant.slug}`}
      className="group block overflow-hidden rounded-3xl border border-ink-800 bg-ink-900 transition-transform active:scale-[0.99]"
    >
      <div
        className="relative h-40"
        style={{
          background: `linear-gradient(135deg, hsl(${restaurant.hue} 45% 22%), hsl(${restaurant.hue + 40} 50% 12%))`,
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-5xl font-black tracking-tight text-white/15 select-none">
            {restaurant.name
              .split(" ")
              .map((w) => w[0])
              .slice(0, 2)
              .join("")}
          </span>
        </div>
        <div className="absolute top-3 left-3">
          <ClaimBadge live={live} />
        </div>
        <div className="absolute top-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[12px] font-bold text-white backdrop-blur">
          ★ {restaurant.rating.toFixed(1)}
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-[16px] font-bold text-stone-100">
              {restaurant.name}
            </h3>
            <p className="mt-0.5 text-[13px] text-stone-400">
              {restaurant.cuisine} · {restaurant.area}
            </p>
          </div>
          <span className="shrink-0 text-[13px] font-semibold text-stone-500">
            {priceTierSymbols(restaurant.priceTier)}
          </span>
        </div>
        <p className="mt-2 text-[13px] text-stone-500">
          {restaurant.priceRangeKobo[1] > 0
            ? `${formatPriceRange(restaurant.priceRangeKobo)} per person`
            : "Aggregated listing"}
        </p>
      </div>
    </Link>
  );
}
