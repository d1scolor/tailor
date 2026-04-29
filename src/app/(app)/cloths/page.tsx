import { redirect } from "next/navigation";
import { InventoryClient } from "@/components/inventory-client";
import { getCurrentUser } from "@/lib/auth/session";
import { listItems, listTags, summary } from "@/lib/repository";

export default async function ClothsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <InventoryClient kind="cloths" items={listItems("cloths", user.id, new URLSearchParams())} summary={summary("cloths", user.id)} tags={listTags(user.id) as any} />;
}
