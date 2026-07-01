import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { defaultLocale } from "@/lib/env";
import { messageLocaleFor, normalizeLocale, type Locale } from "@/lib/i18n/locales";

export { locales, normalizeLocale, type Locale } from "@/lib/i18n/locales";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const requested = cookieStore.get("tailor_locale")?.value;
  const headerLocale = parseAcceptLanguage((await headers()).get("accept-language"));
  const locale = normalizeLocale(requested) ?? headerLocale ?? defaultLocale;
  return {
    locale,
    messages: (await import(`../../../messages/${messageLocaleFor(locale)}.json`)).default
  };
});

function parseAcceptLanguage(value?: string | null): Locale | null {
  if (!value) return null;
  for (const part of value.split(",")) {
    const locale = normalizeLocale(part.trim().split(";")[0]);
    if (locale) return locale;
  }
  return null;
}
