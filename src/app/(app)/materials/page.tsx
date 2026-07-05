import { redirect } from "next/navigation";
import { InventoryClient } from "@/components/inventory-client";
import { getCurrentUser } from "@/lib/auth/session";
import { listColors, listItems, listMeta, listSources, listTags, summary } from "@/lib/repository";

export default async function MaterialsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const params = new URLSearchParams();
  return (
    <InventoryClient
      kind="materials"
      items={listItems("materials", user.id, params)}
      summary={summary("materials", user.id, params)}
      tags={listTags(user.id, "material") as any}
      sourceOptions={listSources("materials", user.id)}
      colorOptions={listColors("materials", user.id)}
      categories={listMeta("material_categories", user.id) as any}
      units={listMeta("material_units", user.id) as any}
      summaryDisplayModes={user.summaryDisplayModes}
    />
  );
}
