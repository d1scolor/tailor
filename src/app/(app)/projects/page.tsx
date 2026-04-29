import { redirect } from "next/navigation";
import { InventoryClient } from "@/components/inventory-client";
import { getCurrentUser } from "@/lib/auth/session";
import { listItems, listTags, summary } from "@/lib/repository";

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
      clothOptions={listItems("cloths", user.id, params)}
      patternOptions={listItems("patterns", user.id, params)}
      materialOptions={listItems("materials", user.id, params)}
    />
  );
}
