import { redirect } from "next/navigation";
import { InventoryClient } from "@/components/inventory-client";
import { getCurrentUser } from "@/lib/auth/session";
import { listItems, listSources, listTags, summary } from "@/lib/repository";

export default async function PatternsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <InventoryClient
      kind="patterns"
      items={listItems("patterns", user.id, new URLSearchParams())}
      summary={summary("patterns", user.id)}
      tags={listTags(user.id) as any}
      sourceOptions={listSources("patterns", user.id)}
    />
  );
}
