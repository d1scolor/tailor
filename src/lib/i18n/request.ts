import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { sessionCookie } from "@/lib/auth/cookie";
import { getUserBySession } from "@/lib/auth/session";
import { defaultLocale } from "@/lib/env";
import { messageLocaleFor, resolveRequestLocale } from "@/lib/i18n/locales";

export { locales, normalizeLocale, type Locale } from "@/lib/i18n/locales";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const user = getUserBySession(cookieStore.get(sessionCookie)?.value);
  const locale = resolveRequestLocale({
    persistedLocale: user?.locale,
    cookieLocale: cookieStore.get("tailor_locale")?.value,
    acceptLanguage: (await headers()).get("accept-language"),
    fallbackLocale: defaultLocale
  });
  const messageLocale = messageLocaleFor(locale);
  return {
    locale,
    messages: (await import(`../../../messages/${messageLocale}.json`)).default
  };
});
