import { notFound, redirect } from "next/navigation";
import { InventoryClient } from "@/components/inventory-client";
import { ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { getItem, listColors, listFabricMaterialTypes, listItems, listSources, listTags, summary } from "@/lib/repository";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function FabricsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const query = await searchParams;
  const initialSelectedItem = selectedItemFromQuery("fabrics", user.id, query.itemId);
  const listParams = new URLSearchParams({
    pageSize: String(user.inventoryPageSize)
  });
  return (
    <InventoryClient
      kind="fabrics"
      items={listItems("fabrics", user.id, listParams)}
      summary={summary("fabrics", user.id)}
      tags={listTags(user.id, "fabric") as any}
      sourceOptions={listSources("fabrics", user.id)}
      colorOptions={listColors("fabrics", user.id)}
      materialTypeOptions={listFabricMaterialTypes(user.id)}
      unitSystem={user.unitSystem}
      summaryDisplayModes={user.summaryDisplayModes}
      initialPageSize={user.inventoryPageSize}
      initialSelectedItem={initialSelectedItem}
    />
  );
}

function selectedItemFromQuery(
  kind: "fabrics",
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
