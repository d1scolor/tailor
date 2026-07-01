import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth/session";
import { localeLabel, locales, normalizeLocale } from "@/lib/i18n/locales";
import { hasMonetaryData, listMeta, listTags } from "@/lib/repository";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const renderedLocale = normalizeLocale(await getLocale()) ?? user.locale;
  return (
    <SettingsClient
      locale={renderedLocale}
      localeOptions={locales.map((locale) => ({ value: locale, label: localeLabel(locale) }))}
      currencyCode={user.currencyCode}
      currencyHasData={hasMonetaryData(user.id)}
      unitSystem={user.unitSystem}
      tags={listTags(user.id) as any}
      categories={listMeta("material_categories", user.id, true) as any}
      units={listMeta("material_units", user.id, true) as any}
    />
  );
}
