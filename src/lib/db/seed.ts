import bcrypt from "bcryptjs";
import { getSqlite } from "@/lib/db/client";
import { nowIso } from "@/lib/time";

const categories = [
  "线",
  "纽扣",
  "拉链",
  "松紧带",
  "衬布",
  "织带",
  "蕾丝",
  "花边",
  "包边条",
  "按扣",
  "钩眼扣",
  "魔术贴",
  "其他"
];

const units = ["个", "米", "厘米", "团", "轴", "包", "卷", "克"];

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
      "INSERT INTO users (username, password_hash, locale, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    ).run(username, hash, process.env.DEFAULT_LOCALE === "zh" ? "zh" : "en", now, now);
  }

  const users = db.prepare("SELECT id FROM users").all() as Array<{ id: number }>;
  for (const user of users) {
    seedList("material_categories", categories, user.id);
    seedList("material_units", units, user.id);
  }
  seeded = true;
}

function seedList(table: "material_categories" | "material_units", names: string[], userId: number) {
  const db = getSqlite();
  const existing = db.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE user_id = ?`).get(userId) as {
    count: number;
  };
  if (existing.count > 0) return;
  const now = nowIso();
  const insert = db.prepare(`INSERT INTO ${table} (user_id, name, sort_order, created_at) VALUES (?, ?, ?, ?)`);
  names.forEach((name, index) => insert.run(userId, name, index, now));
}
