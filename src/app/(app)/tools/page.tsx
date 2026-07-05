import { redirect } from "next/navigation";
import { InventoryClient } from "@/components/inventory-client";
import { getCurrentUser } from "@/lib/auth/session";
import { listItems, listSources, listTags, listToolCategories, summary } from "@/lib/repository";

export default async function ToolsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const listParams = new URLSearchParams({
    pageSize: String(user.inventoryPageSize)
  });
  return (
    <InventoryClient
      kind="tools"
      items={listItems("tools", user.id, listParams)}
      summary={summary("tools", user.id)}
      tags={listTags(user.id, "tool") as any}
      sourceOptions={listSources("tools", user.id)}
      toolCategoryOptions={listToolCategories(user.id)}
      summaryDisplayModes={user.summaryDisplayModes}
      initialPageSize={user.inventoryPageSize}
    />
  );
}
