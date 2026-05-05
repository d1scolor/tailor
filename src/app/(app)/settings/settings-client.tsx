"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { UnitSystem } from "@/lib/units";

type Item = { id: number; name: string; color?: string | null; sortOrder?: number };

export function SettingsClient({
  locale,
  unitSystem,
  tags,
  categories,
  units
}: {
  locale: "en" | "zh";
  unitSystem: UnitSystem;
  tags: Item[];
  categories: Item[];
  units: Item[];
}) {
  const t = useTranslations();
  const [tagList, setTagList] = useState(tags);
  const [categoryList, setCategoryList] = useState(categories);
  const [unitList, setUnitList] = useState(units);
  const [toast, setToast] = useState<string | null>(null);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast((current) => (current === message ? null : current)), 3200);
  }

  async function setLocale(next: "en" | "zh") {
    await fetch("/api/settings/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next })
    });
    window.location.reload();
  }

  async function setUnitSystem(next: UnitSystem) {
    await fetch("/api/settings/unit-system", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unitSystem: next })
    });
    window.location.reload();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = event.currentTarget;
    const form = new FormData(target);
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current: form.get("current"), next: form.get("next") })
      });
      if (response.ok) {
        target.reset();
        notify(t("settings.passwordChanged"));
        return;
      }
      notify(response.status === 401 ? t("settings.passwordInvalid") : response.status === 400 ? t("settings.passwordTooShort") : t("common.error"));
    } catch {
      notify(t("common.error"));
    }
  }

  return (
    <main className="space-y-5">
      <h1 className="text-2xl font-semibold">{t("settings.title")}</h1>
      <Card className="space-y-3 p-4">
        <h2 className="font-semibold">{t("settings.language")}</h2>
        <div className="flex gap-2">
          <Button variant={locale === "en" ? "primary" : "secondary"} onClick={() => setLocale("en")}>
            {t("settings.english")}
          </Button>
          <Button variant={locale === "zh" ? "primary" : "secondary"} onClick={() => setLocale("zh")}>
            {t("settings.chinese")}
          </Button>
        </div>
      </Card>
      <Card className="space-y-3 p-4">
        <h2 className="font-semibold">{t("settings.unitSystem")}</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant={unitSystem === "metric" ? "primary" : "secondary"} onClick={() => setUnitSystem("metric")}>
            {t("settings.metricUnits")}
          </Button>
          <Button variant={unitSystem === "us" ? "primary" : "secondary"} onClick={() => setUnitSystem("us")}>
            {t("settings.usUnits")}
          </Button>
        </div>
      </Card>
      <Card className="p-4">
        <form className="grid gap-3 md:grid-cols-3" onSubmit={changePassword}>
          <h2 className="font-semibold md:col-span-3">{t("settings.password")}</h2>
          <Input name="current" type="password" placeholder={t("auth.currentPassword")} required />
          <Input name="next" type="password" placeholder={t("auth.nextPassword")} required />
          <Button type="submit">{t("common.save")}</Button>
        </form>
      </Card>
      <Manager title={t("settings.manageTags")} endpoint="/api/tags" items={tagList} setItems={setTagList} />
      <Manager title={t("settings.manageCategories")} endpoint="/api/meta/categories" items={categoryList} setItems={setCategoryList} />
      <Manager title={t("settings.manageUnits")} endpoint="/api/meta/units" items={unitList} setItems={setUnitList} />
      <Card className="space-y-3 p-4">
        <h2 className="font-semibold">{t("settings.backup")}</h2>
        <Button asChild>
          <a href="/api/backup">{t("settings.downloadBackup")}</a>
        </Button>
        <RestoreForm />
        <p className="text-sm text-muted-foreground">{t("settings.heicNote")}</p>
      </Card>
      <Button variant="danger" onClick={logout}>
        {t("common.logout")}
      </Button>
      {toast ? <Toast message={toast} /> : null}
    </main>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed inset-x-3 bottom-[calc(92px+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-md bg-foreground px-4 py-3 text-sm text-background shadow-xl md:bottom-6">
      {message}
    </div>
  );
}

function Manager({
  title,
  endpoint,
  items,
  setItems
}: {
  title: string;
  endpoint: string;
  items: Item[];
  setItems: (items: Item[]) => void;
}) {
  const t = useTranslations();
  const [name, setName] = useState("");
  async function create() {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    if (response.ok) {
      const { item } = await response.json();
      setItems([...items, item]);
      setName("");
    }
  }
  async function remove(id: number) {
    await fetch(`${endpoint}/${id}`, { method: "DELETE" });
    setItems(items.filter((item) => item.id !== id));
  }
  return (
    <Card className="space-y-3 p-4">
      <h2 className="font-semibold">{title}</h2>
      <div className="flex gap-2">
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("common.name")} />
        <Button type="button" onClick={create}>
          {t("common.add")}
        </Button>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-md border border-border p-2">
            <span>{item.name}</span>
            <Button size="sm" variant="ghost" onClick={() => remove(item.id)}>
              {t("common.delete")}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RestoreForm() {
  const t = useTranslations();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch("/api/backup/restore", { method: "POST", body: form });
  }
  return (
    <form className="space-y-2" onSubmit={submit}>
      <h3 className="text-sm font-medium">{t("settings.restore")}</h3>
      <Input type="file" name="file" accept=".tar.gz,application/gzip" />
      <Input name="confirm" placeholder={t("settings.restoreConfirm")} />
      <Button type="submit" variant="secondary">
        {t("settings.restore")}
      </Button>
    </form>
  );
}
