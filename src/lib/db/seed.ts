import bcrypt from "bcryptjs";
import { getSqlite } from "@/lib/db/client";
import { defaultLocale, defaultUnitSystem } from "@/lib/env";
import { managedCategoryKeys } from "@/lib/meta";
import { nowIso } from "@/lib/time";
import { defaultManagedUnitKeys } from "@/lib/units";
import { initializeUserCurrencies } from "@/lib/user-settings";

let seeded = false;

export function seedDatabase({ requireBootstrapEnv = false } = {}) {
  if (seeded && !requireBootstrapEnv) return;
  const db = getSqlite();
  const userCount = db.prepare("SELECT COUNT(*) AS count FROM users").get() as { count: number };
  if (userCount.count === 0) {
    const username = process.env.INITIAL_USERNAME;
    const password = process.env.INITIAL_PASSWORD;
    if (!username || !password) {
      if (requireBootstrapEnv) throw new Error("INITIAL_USERNAME and INITIAL_PASSWORD are required for first boot");
      seeded = true;
      return;
    }
    const now = nowIso();
    const hash = bcrypt.hashSync(password, 12);
    db.prepare(
      "INSERT INTO users (username, password_hash, locale, unit_system, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(username, hash, defaultLocale, defaultUnitSystem, now, now);
  }

  const users = db.prepare("SELECT id FROM users").all() as Array<{ id: number }>;
  for (const user of users) {
    seedManagedList("material_categories", managedCategoryKeys, user.id);
    seedManagedList("material_units", defaultManagedUnitKeys, user.id);
  }
  initializeUserCurrencies(db);
  seeded = true;
}

function seedManagedList(table: "material_categories" | "material_units", keys: readonly string[], userId: number) {
  const db = getSqlite();
  const now = nowIso();
  const insert = db.prepare(
    `INSERT OR IGNORE INTO ${table} (user_id, definition_key, active, sort_order, created_at) VALUES (?, ?, 1, ?, ?)`
  );
  keys.forEach((key, index) => insert.run(userId, key, index, now));
}
