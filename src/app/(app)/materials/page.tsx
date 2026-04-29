import { redirect } from "next/navigation";
import { InventoryClient } from "@/components/inventory-client";
import { getCurrentUser } from "@/lib/auth/session";
import { listItems, listMeta, listTags, summary } from "@/lib/repository";

export default async function MaterialsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <InventoryClient
      kind="materials"
      items={listItems("materials", user.id, new URLSearchParams())}
      summary={summary("materials", user.id)}
      tags={listTags(user.id) as any}
      categories={listMeta("material_categories", user.id) as any}
      units={listMeta("material_units", user.id) as any}
    />
  );
}
