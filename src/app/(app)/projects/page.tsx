import { notFound, redirect } from "next/navigation";
import { InventoryClient } from "@/components/inventory-client";
import { ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { getItem, listFabricMaterialTypes, listItems, listMeta, listSources, listTags, summary } from "@/lib/repository";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProjectsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const query = await searchParams;
  const initialRelationshipFilters = {
    fabricId: positiveQueryValue(query.fabricId),
    patternId: positiveQueryValue(query.patternId),
    materialId: positiveQueryValue(query.materialId)
  };
  const listParams = new URLSearchParams();
  for (const [key, value] of Object.entries(initialRelationshipFilters)) {
    if (value) listParams.set(key, value);
  }
  const rawProjectId = firstQueryValue(query.projectId);
  const projectId = positiveQueryValue(query.projectId);
  if (rawProjectId && !projectId) notFound();
  let initialSelectedItem = null;
  if (projectId) {
    try {
      initialSelectedItem = getItem("projects", user.id, Number(projectId));
    } catch (error) {
      if (error instanceof ApiError && error.code === "not_found") notFound();
      throw error;
    }
  }
  const optionParams = new URLSearchParams();
  optionParams.set("sort", "name");
  optionParams.set("dir", "asc");
  return (
    <InventoryClient
      kind="projects"
      items={listItems("projects", user.id, listParams)}
      summary={summary("projects", user.id, listParams)}
      tags={listTags(user.id, "project") as any}
      categories={listMeta("material_categories", user.id) as any}
      units={listMeta("material_units", user.id) as any}
      fabricOptions={listItems("fabrics", user.id, optionParams, { paginate: false })}
      patternOptions={listItems("patterns", user.id, optionParams, { paginate: false })}
      materialOptions={listItems("materials", user.id, optionParams, { paginate: false })}
      fabricSourceOptions={listSources("fabrics", user.id)}
      patternSourceOptions={listSources("patterns", user.id)}
      materialSourceOptions={listSources("materials", user.id)}
      materialTypeOptions={listFabricMaterialTypes(user.id)}
      unitSystem={user.unitSystem}
      summaryDisplayModes={user.summaryDisplayModes}
      initialRelationshipFilters={initialRelationshipFilters}
      initialSelectedItem={initialSelectedItem}
    />
  );
}

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function positiveQueryValue(value: string | string[] | undefined) {
  const raw = firstQueryValue(value);
  if (!raw || !/^[1-9]\d*$/.test(raw)) return undefined;
  return raw;
}
