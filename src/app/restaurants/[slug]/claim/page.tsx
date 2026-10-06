import { notFound } from "next/navigation";
import { fetchRestaurant } from "@/lib/api";
import { ClaimFlow } from "@/components/ClaimFlow";

export default async function ClaimRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await fetchRestaurant(slug);
  // Only unclaimed, non-partner listings can be claimed.
  if (
    !restaurant ||
    restaurant.featured ||
    restaurant.slug.startsWith("hotel-") ||
    restaurant.claimStatus !== "unclaimed"
  )
    notFound();
  return <ClaimFlow restaurant={restaurant} />;
}
