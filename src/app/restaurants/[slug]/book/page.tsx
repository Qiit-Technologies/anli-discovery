import { notFound } from "next/navigation";
import { fetchRestaurant } from "@/lib/api";
import { isLiveBookable } from "@/lib/data";
import { BookFlow } from "@/components/BookFlow";
import { HotelBookFlow } from "@/components/HotelBookFlow";

export default async function BookRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await fetchRestaurant(slug);
  if (!restaurant) notFound();
  // Main (hotel) restaurants book straight into the Anli dashboard's
  // reservation module via the public table-reservations endpoint.
  if (restaurant.slug.startsWith("hotel-")) {
    return <HotelBookFlow restaurant={restaurant} />;
  }
  // BR-01: live booking only for claimed + ops-complete discovery listings;
  // featured partners are showcase-only for now.
  if (restaurant.featured || !isLiveBookable(restaurant)) notFound();
  return <BookFlow restaurant={restaurant} />;
}
