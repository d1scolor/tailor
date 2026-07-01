import localeConfig from "@/lib/locale-config.json";

export const localeDefinitions = localeConfig;
export const locales = Object.keys(localeDefinitions) as [keyof typeof localeDefinitions, ...(keyof typeof localeDefinitions)[]];
export type Locale = (typeof locales)[number];
export type MessageLocale = (typeof localeDefinitions)[Locale]["messageLocale"];
export const messageLocales = [...new Set(locales.map((locale) => localeDefinitions[locale].messageLocale))] as MessageLocale[];

export function normalizeLocale(value?: string | null): Locale | null {
  if (!value) return null;
  const tag = value.trim().replaceAll("_", "-").toLowerCase();
  for (const locale of locales) {
    const definition = localeDefinitions[locale];
    if (locale.toLowerCase() === tag || definition.aliases.some((alias) => alias.toLowerCase() === tag)) {
      return locale;
    }
  }
  return null;
}

export function localeDirection(locale: Locale) {
  return localeDefinitions[locale].direction;
}

export function messageLocaleFor(locale: Locale) {
  return localeDefinitions[locale].messageLocale;
}
