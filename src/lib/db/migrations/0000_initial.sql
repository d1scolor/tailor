PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('cloth','pattern','material','project')),
  entity_id INTEGER NOT NULL,
  original_ext TEXT NOT NULL,
  is_cover INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS photos_entity_idx ON photos(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS cloths (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  length_total REAL NOT NULL,
  length_remaining REAL NOT NULL,
  length_unit TEXT NOT NULL DEFAULT 'm',
  width REAL,
  width_unit TEXT,
  colors TEXT NOT NULL DEFAULT '[]',
  source TEXT,
  price_cents INTEGER,
  purchased_at TEXT,
  remarks TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS patterns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size TEXT,
  pieces INTEGER,
  source TEXT,
  price_cents INTEGER,
  purchased_at TEXT,
  remarks TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS material_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS material_units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category_id INTEGER REFERENCES material_categories(id) ON DELETE SET NULL,
  unit_id INTEGER REFERENCES material_units(id) ON DELETE SET NULL,
  quantity_total REAL NOT NULL,
  quantity_remaining REAL NOT NULL,
  colors TEXT NOT NULL DEFAULT '[]',
  source TEXT,
  price_cents INTEGER,
  purchased_at TEXT,
  remarks TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_cents INTEGER,
  value_cents INTEGER,
  remarks TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS project_cloths (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  cloth_id INTEGER NOT NULL REFERENCES cloths(id) ON DELETE RESTRICT,
  length_used REAL NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS project_cloths_project_idx ON project_cloths(project_id);
CREATE INDEX IF NOT EXISTS project_cloths_cloth_idx ON project_cloths(cloth_id);

CREATE TABLE IF NOT EXISTS project_patterns (
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pattern_id INTEGER NOT NULL REFERENCES patterns(id) ON DELETE RESTRICT,
  PRIMARY KEY(project_id, pattern_id)
);

CREATE TABLE IF NOT EXISTS project_materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  quantity_used REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS project_materials_project_idx ON project_materials(project_id);
CREATE INDEX IF NOT EXISTS project_materials_material_idx ON project_materials(material_id);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS entity_tags (
  entity_type TEXT NOT NULL CHECK(entity_type IN ('cloth','pattern','material','project')),
  entity_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY(entity_type, entity_id, tag_id)
);
CREATE INDEX IF NOT EXISTS entity_tags_tag_idx ON entity_tags(tag_id);
