import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Scissors, Settings } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { DesktopTabs, MobileTabs } from "@/components/app-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const t = await getTranslations();
  return (
    <div className="min-h-dvh pb-[calc(76px+env(safe-area-inset-bottom))] md:pb-0">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/cloths" className="flex items-center gap-2 font-semibold">
            <Scissors className="h-5 w-5" aria-hidden />
            <span>{t("common.brand")}</span>
          </Link>
          <DesktopTabs />
          <Button asChild variant="ghost" size="icon" aria-label={t("common.settings")}>
            <Link href="/settings">
              <Settings className="h-5 w-5" aria-hidden />
            </Link>
          </Button>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-5">{children}</div>
      <MobileTabs />
    </div>
  );
}
