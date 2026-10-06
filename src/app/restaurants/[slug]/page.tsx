import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchRestaurant } from "@/lib/api";
import { isLiveBookable } from "@/lib/data";
import { formatPriceRange, priceTierSymbols } from "@/lib/format";
import { ClaimBadge, Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default async function RestaurantPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await fetchRestaurant(slug);
  if (!restaurant) notFound();

  // FR-02: claim-status check is the fork point for the booking module.
  // Main (hotel) restaurants aren't in the discovery table, so like featured
  // partners they get the showcase panel instead of the booking module.
  const live = isLiveBookable(restaurant);
  const showcase = restaurant.featured || restaurant.slug.startsWith("hotel-");

  return (
    <div className="mx-auto w-full max-w-3xl lg:max-w-5xl">
      {/* Cover */}
      <div className="relative h-56 overflow-hidden sm:rounded-b-3xl lg:h-80">
        {restaurant.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={restaurant.coverImage}
            alt={restaurant.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{
              background: `linear-gradient(135deg, hsl(${restaurant.hue} 45% 24%), hsl(${restaurant.hue + 40} 50% 10%))`,
            }}
          />
        )}
        <Link
          href="/"
          aria-label="Back to discovery"
          className="absolute top-4 left-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur"
        >
          ←
        </Link>
        <div className="absolute inset-0 flex items-center justify-center">
          {!restaurant.coverImage && (
            <span className="text-7xl font-black tracking-tight text-white/15 select-none">
              {restaurant.name
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")}
            </span>
          )}
        </div>
        <div className="absolute bottom-4 left-4">
          {showcase ? (
            <span className="rounded-full bg-amber-400 px-3 py-1.5 text-[12px] font-extrabold text-ink-950">
              ★ Featured Anli partner
            </span>
          ) : (
            <ClaimBadge live={live} />
          )}
        </div>
      </div>

      {/* Info + booking — two columns on desktop, booking sticky */}
      <div className="px-4 pt-4 lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-8 lg:px-6">
        <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[24px] font-extrabold tracking-tight text-white">
              {restaurant.name}
            </h1>
            <p className="mt-1 text-[14px] text-stone-400">
              {restaurant.cuisine} · {restaurant.area}, {restaurant.city}
            </p>
          </div>
          <div className="shrink-0 rounded-2xl bg-ink-900 px-3 py-2 text-center border border-ink-800">
            <p className="text-[16px] font-extrabold text-white">
              ★ {restaurant.rating.toFixed(1)}
            </p>
            <p className="text-[11px] text-stone-500">
              {restaurant.reviewCount} reviews
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {restaurant.tags.map((t) => (
            <Badge key={t}>{t}</Badge>
          ))}
          <Badge>{priceTierSymbols(restaurant.priceTier)}</Badge>
        </div>

        <p className="mt-4 text-[15px] leading-7 text-stone-300">
          {restaurant.description}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-ink-800 bg-ink-900 p-3.5">
            <p className="text-[12px] font-medium text-stone-500">Per person</p>
            <p className="mt-1 text-[15px] font-bold text-stone-100">
              {restaurant.priceRangeKobo[1] > 0
                ? formatPriceRange(restaurant.priceRangeKobo)
                : "—"}
            </p>
          </div>
          <div className="rounded-2xl border border-ink-800 bg-ink-900 p-3.5">
            <p className="text-[12px] font-medium text-stone-500">Hours</p>
            <p className="mt-1 text-[15px] font-bold text-stone-100">
              {restaurant.hours}
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-ink-800 bg-ink-900 p-3.5">
          <p className="text-[12px] font-medium text-stone-500">Address</p>
          <p className="mt-1 text-[15px] font-semibold text-stone-200">
            {restaurant.address}
          </p>
        </div>
        </div>

        {/* Booking module — main/featured partners get a showcase panel;
            discovery listings fork on claim status (FR-02, BR-01) */}
        <div className="mt-6 rounded-3xl border border-ink-700 bg-ink-900 p-5 lg:sticky lg:top-24 lg:mt-4">
          {showcase ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-amber-300">★</span>
                <h2 className="text-[17px] font-bold text-white">
                  An Anli partner restaurant
                </h2>
              </div>
              <p className="mt-1.5 text-[14px] leading-6 text-stone-400">
                {restaurant.name} runs on Anli. In-app booking for partner
                restaurants is coming soon — for now, please contact them
                directly to reserve a table.
              </p>
              {restaurant.address ? (
                <p className="mt-3 text-[14px] font-semibold text-stone-200">
                  📍 {restaurant.address}
                </p>
              ) : null}
            </>
          ) : live ? (
            <>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-brand-400 animate-pulse" />
                <h2 className="text-[17px] font-bold text-white">
                  Live availability
                </h2>
              </div>
              <p className="mt-1.5 text-[14px] text-stone-400">
                Real-time tables at {restaurant.name}. Pick a date, time and
                party size.
              </p>
              <Link href={`/restaurants/${restaurant.slug}/book`} className="mt-4 block">
                <Button fullWidth size="lg">
                  Book a table →
                </Button>
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-[17px] font-bold text-white">Request to book</h2>
              {/* FR-08: request state must be explicit, never look like live slots */}
              <p className="mt-1.5 text-[14px] leading-6 text-stone-400">
                {restaurant.name} isn&apos;t on live booking yet. Send a
                booking request and we&apos;ll pass it to the restaurant —
                <span className="font-semibold text-amber-300">
                  {" "}a request is not a confirmed table.
                </span>
              </p>
              <Link
                href={`/restaurants/${restaurant.slug}/request`}
                className="mt-4 block"
              >
                <Button fullWidth size="lg" variant="secondary">
                  Request to book →
                </Button>
              </Link>
            </>
          )}
        </div>

        <div className="h-6" />
      </div>
    </div>
  );
}
