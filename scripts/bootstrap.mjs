import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const dataDir = process.env.DATA_DIR ?? "/data";
const dbDir = path.join(dataDir, "db");
const photosDir = path.join(dataDir, "photos");
const dbPath = process.env.DATABASE_URL ?? path.join(dbDir, "tailor.db");
const now = () => new Date().toISOString();

fs.mkdirSync(dbDir, { recursive: true, mode: 0o700 });
for (const dir of ["originals", "display", "thumbs"]) {
  fs.mkdirSync(path.join(photosDir, dir), { recursive: true, mode: 0o755 });
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec("CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
const migrationsDir = path.join(process.cwd(), "src/lib/db/migrations");
for (const migration of fs.readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort()) {
  if (!db.prepare("SELECT name FROM _migrations WHERE name = ?").get(migration)) {
    db.transaction(() => {
      db.exec(fs.readFileSync(path.join(migrationsDir, migration), "utf8"));
      db.prepare("INSERT INTO _migrations (name, applied_at) VALUES (?, ?)").run(migration, now());
    })();
    console.log(`Applied migration ${migration}`);
  }
}

const count = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
if (count === 0) {
  if (!process.env.INITIAL_USERNAME || !process.env.INITIAL_PASSWORD) {
    console.error("INITIAL_USERNAME and INITIAL_PASSWORD are required for first boot");
    process.exit(1);
  }
  const timestamp = now();
  db.prepare("INSERT INTO users (username, password_hash, locale, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(
    process.env.INITIAL_USERNAME,
    bcrypt.hashSync(process.env.INITIAL_PASSWORD, 12),
    process.env.DEFAULT_LOCALE === "zh" ? "zh" : "en",
    timestamp,
    timestamp
  );
  console.log("Created bootstrap user");
}

const categories = ["线", "纽扣", "拉链", "松紧带", "衬布", "织带", "蕾丝", "花边", "包边条", "按扣", "钩眼扣", "魔术贴", "其他"];
const units = ["个", "米", "厘米", "团", "轴", "包", "卷", "克"];
for (const user of db.prepare("SELECT id FROM users").all()) {
  seed("material_categories", categories, user.id);
  seed("material_units", units, user.id);
}

function seed(table, names, userId) {
  if (db.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE user_id = ?`).get(userId).count > 0) return;
  const insert = db.prepare(`INSERT INTO ${table} (user_id, name, sort_order, created_at) VALUES (?, ?, ?, ?)`);
  names.forEach((name, index) => insert.run(userId, name, index, now()));
}

db.close();
