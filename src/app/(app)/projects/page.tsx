import { redirect } from "next/navigation";
import { InventoryClient } from "@/components/inventory-client";
import { getCurrentUser } from "@/lib/auth/session";
import { listFabricMaterialTypes, listItems, listMeta, listSources, listTags, summary } from "@/lib/repository";

export default async function ProjectsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const params = new URLSearchParams();
  params.set("sort", "name");
  params.set("dir", "asc");
  return (
    <InventoryClient
      kind="projects"
      items={listItems("projects", user.id, new URLSearchParams())}
      summary={summary("projects", user.id)}
      tags={listTags(user.id) as any}
      categories={listMeta("material_categories", user.id) as any}
      units={listMeta("material_units", user.id) as any}
      fabricOptions={listItems("fabrics", user.id, params)}
      patternOptions={listItems("patterns", user.id, params)}
      materialOptions={listItems("materials", user.id, params)}
      fabricSourceOptions={listSources("fabrics", user.id)}
      patternSourceOptions={listSources("patterns", user.id)}
      materialSourceOptions={listSources("materials", user.id)}
      materialTypeOptions={listFabricMaterialTypes(user.id)}
      unitSystem={user.unitSystem}
    />
  );
}
