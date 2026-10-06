import { notFound } from "next/navigation";
import { fetchRestaurant } from "@/lib/api";
import { isLiveBookable } from "@/lib/data";
import { RequestFlow } from "@/components/RequestFlow";

export default async function RequestRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await fetchRestaurant(slug);
  // Path B is only for unclaimed (or not-yet-configured) restaurants
  if (!restaurant || isLiveBookable(restaurant)) notFound();
  return <RequestFlow restaurant={restaurant} />;
}
