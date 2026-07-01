import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { localeDirection, normalizeLocale } from "@/lib/i18n/locales";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tailor",
  applicationName: "Tailor",
  appleWebApp: {
    capable: true,
    title: "Tailor",
    statusBarStyle: "default"
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }
    ],
    apple: "/icons/apple-touch-icon.png"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#12796f"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const supportedLocale = normalizeLocale(locale) ?? "en-AU";
  return (
    <html lang={supportedLocale} dir={localeDirection(supportedLocale)}>
      <body>
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
