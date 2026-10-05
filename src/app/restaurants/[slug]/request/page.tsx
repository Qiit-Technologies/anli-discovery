import { notFound } from "next/navigation";
import { getRestaurant, isLiveBookable } from "@/lib/data";
import { RequestFlow } from "@/components/RequestFlow";

export default async function RequestRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = getRestaurant(slug);
  // Path B is only for unclaimed (or not-yet-configured) restaurants
  if (!restaurant || isLiveBookable(restaurant)) notFound();
  return <RequestFlow restaurant={restaurant} />;
}
