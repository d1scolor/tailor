"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { BarChart3, FolderKanban, Package, Scissors, Shirt, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const tabs = [
  ["cloths", "/cloths"],
  ["materials", "/materials"],
  ["patterns", "/patterns"],
  ["tools", "/tools"],
  ["projects", "/projects"]
] as const;

const icons = {
  overview: BarChart3,
  cloths: Shirt,
  patterns: Scissors,
  materials: Package,
  projects: FolderKanban,
  tools: Wrench
} as const;

export function DesktopTabs() {
  const pathname = usePathname();
  const t = useTranslations();
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {tabs.map(([key, href]) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Button key={key} asChild variant={active ? "primary" : "ghost"}>
            <Link href={href}>{t(`nav.${key}`)}</Link>
          </Button>
        );
      })}
    </nav>
  );
}

export function OverviewButton() {
  const pathname = usePathname();
  const t = useTranslations();
  const active = pathname === "/overview" || pathname.startsWith("/overview/");
  return (
    <Button asChild variant={active ? "primary" : "ghost"} size="icon" aria-label={t("nav.overview")}>
      <Link href="/overview">
        <BarChart3 className="h-5 w-5" aria-hidden />
      </Link>
    </Button>
  );
}

export function MobileTabs() {
  const pathname = usePathname();
  const t = useTranslations();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-card px-2 pb-[env(safe-area-inset-bottom)] pt-2 md:hidden">
      {tabs.map(([key, href]) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const Icon = icons[key];
        return (
          <Link
            key={key}
            href={href}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-2 py-2 text-center text-[11px] font-medium",
              active && "bg-primary text-primary-foreground"
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {t(`nav.${key}`)}
          </Link>
        );
      })}
    </nav>
  );
}
