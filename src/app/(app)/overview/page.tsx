import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { money, numberValue } from "@/lib/format";
import { summary } from "@/lib/repository";

type Metric = {
  label: string;
  value: string | number;
};

type Category = {
  key: "cloths" | "materials" | "patterns" | "tools" | "projects";
  cost: number;
  metrics: Metric[];
};

export default async function OverviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const t = await getTranslations();
  const cloths = summary("cloths", user.id);
  const materials = summary("materials", user.id);
  const patterns = summary("patterns", user.id);
  const tools = summary("tools", user.id);
  const projects = summary("projects", user.id);

  const inventoryCount = (cloths.count ?? 0) + (materials.count ?? 0) + (patterns.count ?? 0) + (tools.count ?? 0);
  const totalSpend = (cloths.totalCost ?? 0) + (materials.totalCost ?? 0) + (patterns.totalCost ?? 0) + (tools.totalCost ?? 0) + (projects.totalCost ?? 0);
  const categories: Category[] = [
    {
      key: "cloths",
      cost: cloths.totalCost ?? 0,
      metrics: [
        { label: t("overview.count"), value: cloths.count ?? 0 },
        { label: t("cloths.usedLength"), value: `${numberValue(cloths.lengthUsedMetres)} m` },
        { label: t("cloths.remainingLength"), value: `${numberValue(cloths.lengthRemainingMetres)} m` }
      ]
    },
    {
      key: "materials",
      cost: materials.totalCost ?? 0,
      metrics: [
        { label: t("overview.count"), value: materials.count ?? 0 },
        { label: t("overview.used"), value: materials.used ?? 0 },
        { label: t("overview.unused"), value: materials.unused ?? 0 }
      ]
    },
    {
      key: "patterns",
      cost: patterns.totalCost ?? 0,
      metrics: [
        { label: t("overview.count"), value: patterns.count ?? 0 },
        { label: t("overview.used"), value: patterns.used ?? 0 },
        { label: t("overview.unused"), value: patterns.unused ?? 0 }
      ]
    },
    {
      key: "tools",
      cost: tools.totalCost ?? 0,
      metrics: [
        { label: t("overview.count"), value: tools.count ?? 0 },
        { label: t("overview.totalQuantity"), value: tools.totalQuantity ?? 0 }
      ]
    },
    {
      key: "projects",
      cost: projects.totalCost ?? 0,
      metrics: [
        { label: t("overview.count"), value: projects.count ?? 0 },
        { label: t("overview.produced"), value: projects.totalProduced ?? 0 },
        { label: t("projects.value"), value: money(projects.totalValue ?? 0) }
      ]
    }
  ];
  const spendingCategories = categories.filter((category) => category.key !== "projects");
  const maxCategorySpend = Math.max(...spendingCategories.map((category) => category.cost), 1);

  return (
    <main className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">{t("overview.title")}</h1>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label={t("common.summary")}>
        <SummaryCard label={t("overview.totalSpend")} value={money(totalSpend)} />
        <SummaryCard label={t("overview.inventoryItems")} value={inventoryCount} />
        <SummaryCard label={t("overview.clothRemaining")} value={`${numberValue(cloths.lengthRemainingMetres)} m`} />
        <SummaryCard label={t("overview.projectValue")} value={money(projects.totalValue ?? 0)} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="p-4">
          <h2 className="text-base font-semibold">{t("overview.spending")}</h2>
          <div className="mt-4 space-y-3">
            {spendingCategories.map((category) => (
              <div key={category.key} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium">{t(`nav.${category.key}`)}</span>
                  <span className="text-muted-foreground">{money(category.cost)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max((category.cost / maxCategorySpend) * 100, category.cost ? 4 : 0)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-base font-semibold">{t("overview.categoryMetrics")}</h2>
          <div className="mt-4 divide-y divide-border">
            {categories.map((category) => (
              <div key={category.key} className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[9rem_1fr]">
                <div>
                  <div className="font-medium">{t(`nav.${category.key}`)}</div>
                  <div className="text-sm text-muted-foreground">{money(category.cost)}</div>
                </div>
                <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {category.metrics.map((metric) => (
                    <div key={metric.label} className="min-w-0">
                      <dt className="truncate text-xs text-muted-foreground">{metric.label}</dt>
                      <dd className="truncate text-sm font-medium">{metric.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </Card>
  );
}
