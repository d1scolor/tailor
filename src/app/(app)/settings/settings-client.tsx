"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { isManagedUnitKey, managedUnitDefinitions, type UnitSystem } from "@/lib/units";
import type { Locale } from "@/lib/i18n/locales";
import { currencyCodes, currencyFractionDigits, type CurrencyCode } from "@/lib/currency";
import type { EntityType } from "@/lib/repository";

type Item = {
  id: number;
  name?: string;
  definitionKey?: string | null;
  customName?: string | null;
  active?: number;
  color?: string | null;
  sortOrder?: number;
  entityType?: EntityType;
};

const tagScopes: Array<{ value: EntityType; labelKey: string }> = [
  { value: "fabric", labelKey: "fabrics.title" },
  { value: "pattern", labelKey: "patterns.title" },
  { value: "material", labelKey: "materials.title" },
  { value: "project", labelKey: "projects.title" },
  { value: "tool", labelKey: "tools.title" }
];

export function SettingsClient({
  username,
  locale,
  localeOptions,
  currencyCode,
  currencyHasData,
  unitSystem,
  tags,
  categories,
  units
}: {
  username: string;
  locale: Locale;
  localeOptions: { value: Locale; label: string }[];
  currencyCode: CurrencyCode;
  currencyHasData: boolean;
  unitSystem: UnitSystem;
  tags: Item[];
  categories: Item[];
  units: Item[];
}) {
  const t = useTranslations();
  const [tagList, setTagList] = useState(tags);
  const [tagScope, setTagScope] = useState<EntityType>("fabric");
  const [categoryList, setCategoryList] = useState(categories);
  const [unitList, setUnitList] = useState(units.filter((item) => item.definitionKey !== "unspecified"));
  const [toast, setToast] = useState<string | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

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
    if (form.get("next") !== form.get("confirm")) {
      notify(t("settings.passwordMismatch"));
      return;
    }
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current: form.get("current"), next: form.get("next") })
      });
      if (response.ok) {
        target.reset();
        setShowPasswordForm(false);
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
      <Card className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h2 className="font-semibold">{t("settings.account")}</h2>
            <p className="text-sm text-muted-foreground">{t("settings.signedInAs", { username })}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button type="button" variant="secondary" onClick={() => setShowPasswordForm((current) => !current)}>
              {t("settings.password")}
            </Button>
            <Button type="button" variant="danger" onClick={logout}>
              {t("common.logout")}
            </Button>
          </div>
        </div>
        {showPasswordForm ? (
          <form className="mt-4 grid gap-3 border-t border-border pt-4 md:grid-cols-3" onSubmit={changePassword}>
            <label className="grid gap-1 text-sm font-medium">
              {t("auth.currentPassword")}
              <Input name="current" type="password" autoComplete="current-password" required />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              {t("auth.nextPassword")}
              <Input name="next" type="password" autoComplete="new-password" minLength={12} maxLength={72} required />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              {t("settings.confirmPassword")}
              <Input name="confirm" type="password" autoComplete="new-password" minLength={12} maxLength={72} required />
            </label>
            <div className="flex flex-wrap justify-end gap-2 md:col-span-3">
              <Button type="button" variant="secondary" onClick={() => setShowPasswordForm(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit">{t("common.save")}</Button>
            </div>
          </form>
        ) : null}
      </Card>
      <Card className="space-y-3 p-4">
        <h2 className="font-semibold">{t("settings.language")}</h2>
        <Select
          className="max-w-xs"
          value={locale}
          onChange={(event) => setLocale(event.target.value as Locale)}
        >
          {localeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
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
      <Manager
        kind="plain"
        title={t("settings.manageTags")}
        endpoint="/api/tags"
        items={tagList}
        setItems={setTagList}
        unitSystem={unitSystem}
        notify={notify}
        tagScope={tagScope}
        onTagScopeChange={setTagScope}
      />
      <Manager kind="category" title={t("settings.manageCategories")} endpoint="/api/meta/categories" items={categoryList} setItems={setCategoryList} unitSystem={unitSystem} notify={notify} />
      <Manager kind="unit" title={t("settings.manageUnits")} endpoint="/api/meta/units" items={unitList} setItems={setUnitList} unitSystem={unitSystem} notify={notify} />
      <Card className="space-y-3 p-4">
        <h2 className="font-semibold">{t("settings.backup")}</h2>
        <Button asChild>
          <a href="/api/backup">{t("settings.downloadBackup")}</a>
        </Button>
        <RestoreForm />
      </Card>
      <Card className="space-y-2 p-4 text-sm">
        <h2 className="font-semibold">{t("settings.about")}</h2>
        <p className="font-medium">{t("common.brand")}</p>
        <p className="text-muted-foreground">{t("settings.copyright")}</p>
        <p className="text-muted-foreground">{t("settings.licenseNotice")}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <a
            className="font-medium underline-offset-4 hover:underline"
            href="https://github.com/d1scolor/tailor"
            rel="noreferrer"
            target="_blank"
          >
            {t("settings.sourceCode")}
          </a>
          <a
            className="font-medium underline-offset-4 hover:underline"
            href="https://github.com/d1scolor/tailor/blob/main/LICENSE"
            rel="noreferrer"
            target="_blank"
          >
            {t("settings.license")}
          </a>
        </div>
      </Card>
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
  notify,
  tagScope,
  onTagScopeChange
}: {
  kind: "plain" | "category" | "unit";
  title: string;
  endpoint: string;
  items: Item[];
  setItems: (items: Item[]) => void;
  unitSystem: UnitSystem;
  notify: (message: string) => void;
  tagScope?: EntityType;
  onTagScopeChange?: (scope: EntityType) => void;
}) {
  const t = useTranslations();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const visibleItems =
    kind === "plain" && tagScope
      ? items.filter((item) => item.entityType === tagScope)
      : items;
  async function create() {
    if (!name.trim()) return;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, ...(kind === "plain" && tagScope ? { entityType: tagScope } : {}) })
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
      {kind === "plain" && tagScope && onTagScopeChange ? (
        <label className="block max-w-xs space-y-1">
          <span className="text-sm font-medium">{t("settings.tagCategory")}</span>
          <Select
            value={tagScope}
            onChange={(event) => {
              setEditingId(null);
              setEditingName("");
              onTagScopeChange(event.target.value as EntityType);
            }}
          >
            {tagScopes.map((scope) => (
              <option key={scope.value} value={scope.value}>
                {t(scope.labelKey as any)}
              </option>
            ))}
          </Select>
        </label>
      ) : null}
      <div className="flex gap-2">
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("common.name")} />
        <Button type="button" onClick={create}>
          {t("common.add")}
        </Button>
      </div>
      <div className="space-y-2">
        {visibleItems.map((item) => (
          <div key={item.id} className={`flex items-center justify-between gap-2 rounded-md border border-border p-2 ${item.active === 0 ? "opacity-60" : ""}`}>
            {editingId === item.id ? (
              <Input value={editingName} onChange={(event) => setEditingName(event.target.value)} />
            ) : (
              <span>{metaLabel(item, kind, unitSystem, t)}</span>
            )}
            <div className="flex gap-1">
              {editingId === item.id ? (
                <Button size="sm" variant="ghost" onClick={() => rename(item.id)}>{t("common.save")}</Button>
              ) : (kind === "plain" ? item.name : item.customName) && item.active !== 0 ? (
                <Button size="sm" variant="ghost" onClick={() => { setEditingId(item.id); setEditingName(kind === "plain" ? item.name ?? "" : item.customName ?? ""); }}>{t("common.edit")}</Button>
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
    const file = form.get("file");
    if (!(file instanceof File) || form.get("confirm") !== "RESTORE") return;
    const response = await fetch("/api/backup/restore", {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/gzip",
        "X-Tailor-Restore-Confirm": "RESTORE"
      },
      body: file
    });
    if (response.ok) window.location.assign("/login");
  }
  return (
    <form className="space-y-2" onSubmit={submit}>
      <h3 className="text-sm font-medium">{t("settings.restore")}</h3>
      <Input className="py-2 file:mr-3 file:align-middle" type="file" name="file" accept=".tar.gz,application/gzip" required />
      <Input name="confirm" placeholder={t("settings.restoreConfirm")} required />
      <Button type="submit" variant="secondary">
        {t("settings.restore")}
      </Button>
    </form>
  );
}
