import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Scissors, Settings } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { DesktopTabs, GlobalRefreshButton, MobileTabs, OverviewButton } from "@/components/app-nav";
import { CurrencyProvider } from "@/components/currency-provider";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const t = await getTranslations();
  return (
    <div className="min-h-dvh pb-[calc(76px+env(safe-area-inset-bottom))] md:pb-0">
      <CurrencyProvider code={user.currencyCode}>
        <header className="sticky top-0 z-50 border-b border-border bg-background px-4 py-3">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <Link href="/overview" className="flex items-center gap-2 font-semibold">
              <Scissors className="h-5 w-5" aria-hidden />
              <span>{t("common.brand")}</span>
            </Link>
            <DesktopTabs />
            <div className="flex items-center gap-1">
              <OverviewButton />
              <GlobalRefreshButton />
              <Button asChild variant="ghost" size="icon" aria-label={t("common.settings")}>
                <Link href="/settings">
                  <Settings className="h-5 w-5" aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-6xl px-4 py-5">{children}</div>
        <MobileTabs />
      </CurrencyProvider>
    </div>
  );
}
