import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { listMeta, listTags } from "@/lib/repository";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <SettingsClient
      locale={user.locale}
      unitSystem={user.unitSystem}
      tags={listTags(user.id) as any}
      categories={listMeta("material_categories", user.id, true) as any}
      units={listMeta("material_units", user.id, true) as any}
    />
  );
}
