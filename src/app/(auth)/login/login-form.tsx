"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const t = useTranslations();
  const [error, setError] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(false);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: form.get("username"),
        password: form.get("password")
      })
    });
    if (response.ok) window.location.href = "/cloths";
    else setError(true);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-sm p-5">
        <form className="space-y-4" onSubmit={submit}>
          <div>
            <h1 className="text-2xl font-semibold">{t("common.brand")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("auth.login")}</p>
          </div>
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t("auth.username")}</span>
            <Input name="username" autoComplete="username" required />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t("auth.password")}</span>
            <Input name="password" type="password" autoComplete="current-password" required />
          </label>
          {error ? <p className="text-sm text-destructive">{t("auth.invalid")}</p> : null}
          <Button className="w-full" type="submit">
            {t("auth.login")}
          </Button>
        </form>
      </Card>
    </main>
  );
}
