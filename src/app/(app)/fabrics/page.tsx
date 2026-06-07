import { redirect } from "next/navigation";
import { InventoryClient } from "@/components/inventory-client";
import { getCurrentUser } from "@/lib/auth/session";
import { listFabricMaterialTypes, listItems, listSources, listTags, summary } from "@/lib/repository";

export default async function FabricsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <InventoryClient
      kind="fabrics"
      items={listItems("fabrics", user.id, new URLSearchParams())}
      summary={summary("fabrics", user.id)}
      tags={listTags(user.id) as any}
      sourceOptions={listSources("fabrics", user.id)}
      materialTypeOptions={listFabricMaterialTypes(user.id)}
      unitSystem={user.unitSystem}
    />
  );
}
