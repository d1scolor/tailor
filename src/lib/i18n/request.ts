import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { defaultLocale } from "@/lib/env";

export const locales = ["en", "zh"] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const requested = cookieStore.get("tailor_locale")?.value;
  const headerLocale = parseAcceptLanguage((await headers()).get("accept-language"));
  const locale = normalizeLocale(requested) ?? headerLocale ?? defaultLocale;
  return {
    locale,
    messages: (await import(`../../../messages/${locale}.json`)).default
  };
});

export function normalizeLocale(locale?: string | null): Locale | null {
  if (locale === "zh" || locale === "zh-CN") return "zh";
  if (locale === "en") return "en";
  return null;
}

function parseAcceptLanguage(value?: string | null): Locale | null {
  if (!value) return null;
  for (const part of value.split(",")) {
    const locale = normalizeLocale(part.trim().split(";")[0]);
    if (locale) return locale;
  }
  return null;
}
