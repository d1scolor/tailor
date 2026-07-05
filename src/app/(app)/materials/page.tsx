import { notFound, redirect } from "next/navigation";
import { InventoryClient } from "@/components/inventory-client";
import { ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { getItem, listColors, listItems, listMeta, listSources, listTags, summary } from "@/lib/repository";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MaterialsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const query = await searchParams;
  const initialSelectedItem = selectedItemFromQuery("materials", user.id, query.itemId);
  const listParams = new URLSearchParams({
    pageSize: String(user.inventoryPageSize)
  });
  return (
    <InventoryClient
      kind="materials"
      items={listItems("materials", user.id, listParams)}
      summary={summary("materials", user.id)}
      tags={listTags(user.id, "material") as any}
      sourceOptions={listSources("materials", user.id)}
      colorOptions={listColors("materials", user.id)}
      categories={listMeta("material_categories", user.id) as any}
      units={listMeta("material_units", user.id) as any}
      summaryDisplayModes={user.summaryDisplayModes}
      initialPageSize={user.inventoryPageSize}
      initialSelectedItem={initialSelectedItem}
    />
  );
}

function selectedItemFromQuery(
  kind: "materials",
  userId: number,
  value: string | string[] | undefined
) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  if (!/^[1-9]\d*$/.test(raw)) notFound();
  try {
    return getItem(kind, userId, Number(raw));
  } catch (error) {
    if (error instanceof ApiError && error.code === "not_found") notFound();
    throw error;
  }
}
