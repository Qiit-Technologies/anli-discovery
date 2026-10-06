import { notFound } from "next/navigation";
import { fetchRestaurant } from "@/lib/api";
import { isLiveBookable } from "@/lib/data";
import { BookFlow } from "@/components/BookFlow";

export default async function BookRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await fetchRestaurant(slug);
  // BR-01: live booking only for claimed + ops-complete discovery listings;
  // featured partners are showcase-only for now.
  if (
    !restaurant ||
    restaurant.featured ||
    restaurant.slug.startsWith("hotel-") ||
    !isLiveBookable(restaurant)
  )
    notFound();
  return <BookFlow restaurant={restaurant} />;
}
