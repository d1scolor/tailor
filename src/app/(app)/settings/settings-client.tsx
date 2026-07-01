"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { isManagedUnitKey, managedUnitDefinitions, type UnitSystem } from "@/lib/units";
import { localeDefinitions, locales, type Locale } from "@/lib/i18n/locales";
import { currencyCodes, currencyFractionDigits, type CurrencyCode } from "@/lib/currency";

type Item = {
  id: number;
  name?: string;
  definitionKey?: string | null;
  customName?: string | null;
  active?: number;
  color?: string | null;
  sortOrder?: number;
};

export function SettingsClient({
  locale,
  currencyCode,
  currencyHasData,
  unitSystem,
  tags,
  categories,
  units
}: {
  locale: Locale;
  currencyCode: CurrencyCode;
  currencyHasData: boolean;
  unitSystem: UnitSystem;
  tags: Item[];
  categories: Item[];
  units: Item[];
}) {
  const t = useTranslations();
  const [tagList, setTagList] = useState(tags);
  const [categoryList, setCategoryList] = useState(categories);
  const [unitList, setUnitList] = useState(units.filter((item) => item.definitionKey !== "unspecified"));
  const [toast, setToast] = useState<string | null>(null);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast((current) => (current === message ? null : current)), 3200);
  }

  async function setLocale(next: Locale) {
    try {
      const response = await fetch("/api/settings/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next })
      });
      if (!response.ok) return notify(t("common.error"));
      window.location.reload();
    } catch {
      notify(t("common.error"));
    }
  }

  async function setUnitSystem(next: UnitSystem) {
    try {
      const response = await fetch("/api/settings/unit-system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitSystem: next })
      });
      if (!response.ok) return notify(t("common.error"));
      window.location.reload();
    } catch {
      notify(t("common.error"));
    }
  }

  async function setCurrency(next: CurrencyCode) {
    if (next === currencyCode) return;
    let confirmReinterpret = false;
    if (currencyHasData) {
      const precisionWarning =
        currencyFractionDigits(next) === 0
          ? ` ${t("settings.currencyZeroDecimalWarning", { currency: next })}`
          : "";
      confirmReinterpret = window.confirm(
        `${t("settings.currencyReinterpretConfirm", { from: currencyCode, to: next })}${precisionWarning}`
      );
      if (!confirmReinterpret) return;
    }
    try {
      const response = await fetch("/api/settings/currency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currencyCode: next, confirmReinterpret })
      });
      if (!response.ok) return notify(await settingsErrorMessage(response, t));
      window.location.reload();
    } catch {
      notify(t("common.error"));
    }
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
        <div className="flex flex-wrap gap-2">
          {locales.map((supportedLocale) => (
            <Button
              key={supportedLocale}
              variant={locale === supportedLocale ? "primary" : "secondary"}
              onClick={() => setLocale(supportedLocale)}
            >
              {t(localeDefinitions[supportedLocale].labelKey)}
            </Button>
          ))}
        </div>
      </Card>
      <Card className="space-y-3 p-4">
        <h2 className="font-semibold">{t("settings.currency")}</h2>
        <Select
          className="max-w-xs"
          value={currencyCode}
          onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
        >
          {currencyCodes.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </Select>
        {currencyHasData ? <p className="text-sm text-muted-foreground">{t("settings.currencyReinterpretNote")}</p> : null}
      </Card>
      <Card className="space-y-3 p-4">
        <h2 className="font-semibold">{t("settings.unitSystem")}</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant={unitSystem === "metric" ? "primary" : "secondary"} onClick={() => setUnitSystem("metric")}>
            {t("settings.metricUnits")}
          </Button>
          <Button variant={unitSystem === "imperial" ? "primary" : "secondary"} onClick={() => setUnitSystem("imperial")}>
            {t("settings.imperialUnits")}
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
      <Manager kind="plain" title={t("settings.manageTags")} endpoint="/api/tags" items={tagList} setItems={setTagList} unitSystem={unitSystem} notify={notify} />
      <Manager kind="category" title={t("settings.manageCategories")} endpoint="/api/meta/categories" items={categoryList} setItems={setCategoryList} unitSystem={unitSystem} notify={notify} />
      <Manager kind="unit" title={t("settings.manageUnits")} endpoint="/api/meta/units" items={unitList} setItems={setUnitList} unitSystem={unitSystem} notify={notify} />
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
  kind,
  title,
  endpoint,
  items,
  setItems,
  unitSystem,
  notify
}: {
  kind: "plain" | "category" | "unit";
  title: string;
  endpoint: string;
  items: Item[];
  setItems: (items: Item[]) => void;
  unitSystem: UnitSystem;
  notify: (message: string) => void;
}) {
  const t = useTranslations();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  async function create() {
    if (!name.trim()) return;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    if (response.ok) {
      const { item } = await response.json();
      setItems([...items, item]);
      setName("");
    } else {
      notify(await settingsErrorMessage(response, t));
    }
  }
  async function remove(id: number) {
    const response = await fetch(`${endpoint}/${id}`, { method: "DELETE" });
    if (!response.ok) {
      notify(await settingsErrorMessage(response, t));
      return;
    }
    if (kind === "plain") {
      setItems(items.filter((item) => item.id !== id));
      return;
    }
    const { item } = await response.json();
    setItems(items.map((current) => (current.id === id ? item : current)));
  }
  async function restore(id: number) {
    const response = await fetch(`${endpoint}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: true })
    });
    if (!response.ok) {
      notify(await settingsErrorMessage(response, t));
      return;
    }
    const { item } = await response.json();
    setItems(items.map((current) => (current.id === id ? item : current)));
  }
  async function rename(id: number) {
    if (!editingName.trim()) return;
    const response = await fetch(`${endpoint}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingName.trim() })
    });
    if (!response.ok) {
      notify(await settingsErrorMessage(response, t));
      return;
    }
    const { item } = await response.json();
    setItems(items.map((current) => (current.id === id ? item : current)));
    setEditingId(null);
    setEditingName("");
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
          <div key={item.id} className={`flex items-center justify-between gap-2 rounded-md border border-border p-2 ${item.active === 0 ? "opacity-60" : ""}`}>
            {editingId === item.id ? (
              <Input value={editingName} onChange={(event) => setEditingName(event.target.value)} />
            ) : (
              <span>{metaLabel(item, kind, unitSystem, t)}</span>
            )}
            <div className="flex gap-1">
              {editingId === item.id ? (
                <Button size="sm" variant="ghost" onClick={() => rename(item.id)}>{t("common.save")}</Button>
              ) : item.customName && item.active !== 0 ? (
                <Button size="sm" variant="ghost" onClick={() => { setEditingId(item.id); setEditingName(item.customName ?? ""); }}>{t("common.edit")}</Button>
              ) : null}
              {item.active === 0 ? (
                <Button size="sm" variant="ghost" onClick={() => restore(item.id)}>{t("common.restore")}</Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => remove(item.id)}>
                  {kind === "plain" ? t("common.delete") : t("common.hide")}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

async function settingsErrorMessage(response: Response, t: ReturnType<typeof useTranslations>) {
  const body = await response.json().catch(() => null);
  const known = new Set([
    "validation",
    "duplicate_name",
    "managed_value",
    "currency_confirmation_required",
    "not_found",
    "unknown"
  ]);
  return typeof body?.error === "string" && known.has(body.error)
    ? t(`errors.${body.error}` as any)
    : t("common.error");
}

function metaLabel(item: Item, kind: "plain" | "category" | "unit", unitSystem: UnitSystem, t: ReturnType<typeof useTranslations>) {
  if (item.name) return item.name;
  if (item.customName) return item.customName;
  if (!item.definitionKey) return "";
  if (kind === "category") return t(`meta.categories.${item.definitionKey}` as any);
  if (kind === "unit" && isManagedUnitKey(item.definitionKey)) {
    const definition = managedUnitDefinitions[item.definitionKey];
    if (definition.behavior === "static") return t(definition.labelKey as any);
    const display = definition[unitSystem];
    return `${t(display.labelKey as any)} (${display.symbol})`;
  }
  return item.definitionKey;
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
