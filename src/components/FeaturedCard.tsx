import Link from "next/link";
import type { Restaurant } from "@/lib/types";

/** Horizontal showcase card for featured Anli partner restaurants. */
export function FeaturedCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <Link
      href={`/restaurants/${restaurant.slug}`}
      className="group block w-60 shrink-0 overflow-hidden rounded-3xl border border-amber-400/25 bg-ink-900 transition-transform active:scale-[0.98]"
    >
      <div className="relative h-32">
        {restaurant.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={restaurant.coverImage}
            alt={restaurant.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              background: `linear-gradient(135deg, hsl(${restaurant.hue} 45% 22%), hsl(${restaurant.hue + 40} 50% 12%))`,
            }}
          >
            <span className="text-4xl font-black tracking-tight text-white/15 select-none">
              {restaurant.name
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")}
            </span>
          </div>
        )}
        <div className="absolute top-2.5 left-2.5 rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-extrabold text-ink-950">
          ★ Featured
        </div>
        <div className="absolute top-2.5 right-2.5 rounded-full bg-black/55 px-2.5 py-1 text-[12px] font-bold text-white backdrop-blur">
          ★ {restaurant.rating.toFixed(1)}
        </div>
      </div>
      <div className="p-3.5">
        <h3 className="truncate text-[15px] font-bold text-stone-100">
          {restaurant.name}
        </h3>
        <p className="mt-0.5 truncate text-[12px] text-stone-400">
          {restaurant.city}
          {restaurant.area ? ` · ${restaurant.area}` : ""}
        </p>
      </div>
    </Link>
  );
}
