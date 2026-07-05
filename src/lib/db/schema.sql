PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  unit_system TEXT NOT NULL DEFAULT 'metric',
  currency_code TEXT,
  fabric_used_value_display INTEGER NOT NULL DEFAULT 0
    CHECK (fabric_used_value_display IN (0, 1)),
  fabric_remaining_value_display INTEGER NOT NULL DEFAULT 0
    CHECK (fabric_remaining_value_display IN (0, 1)),
  project_labor_cost_display INTEGER NOT NULL DEFAULT 0
    CHECK (project_labor_cost_display IN (0, 1)),
  inventory_page_size TEXT NOT NULL DEFAULT '20'
    CHECK (inventory_page_size IN ('20', '50', '100', 'all')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX sessions_user_idx ON sessions(user_id);

CREATE TABLE fabrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  length_total_m REAL NOT NULL,
  width_m REAL,
  colors TEXT NOT NULL DEFAULT '[]',
  purpose TEXT NOT NULL DEFAULT 'garment',
  material_type TEXT NOT NULL DEFAULT 'other',
  source TEXT,
  price_cents INTEGER,
  purchased_at TEXT,
  remarks TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE patterns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pattern_type TEXT NOT NULL DEFAULT 'paper',
  difficulty TEXT NOT NULL DEFAULT 'medium',
  pattern_for TEXT,
  size TEXT,
  pieces INTEGER,
  source TEXT,
  price_cents INTEGER,
  purchased_at TEXT,
  remarks TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE material_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  definition_key TEXT,
  custom_name TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  CHECK (
    (definition_key IS NOT NULL AND custom_name IS NULL) OR
    (definition_key IS NULL AND custom_name IS NOT NULL)
  )
);
CREATE UNIQUE INDEX material_categories_user_definition
  ON material_categories(user_id, definition_key)
  WHERE definition_key IS NOT NULL;
CREATE UNIQUE INDEX material_categories_user_custom_name
  ON material_categories(user_id, custom_name)
  WHERE custom_name IS NOT NULL;

CREATE TABLE material_units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  definition_key TEXT,
  custom_name TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  CHECK (
    (definition_key IS NOT NULL AND custom_name IS NULL) OR
    (definition_key IS NULL AND custom_name IS NOT NULL)
  )
);
CREATE UNIQUE INDEX material_units_user_definition
  ON material_units(user_id, definition_key)
  WHERE definition_key IS NOT NULL;
CREATE UNIQUE INDEX material_units_user_custom_name
  ON material_units(user_id, custom_name)
  WHERE custom_name IS NOT NULL;

CREATE TABLE materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category_id INTEGER REFERENCES material_categories(id) ON DELETE SET NULL,
  unit_id INTEGER NOT NULL REFERENCES material_units(id) ON DELETE RESTRICT,
  quantity_total_canonical REAL NOT NULL,
  is_used_up INTEGER NOT NULL DEFAULT 0 CHECK (is_used_up IN (0, 1)),
  colors TEXT NOT NULL DEFAULT '[]',
  source TEXT,
  price_cents INTEGER,
  purchased_at TEXT,
  remarks TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  quantity INTEGER NOT NULL DEFAULT 1,
  price_cents INTEGER,
  value_cents INTEGER,
  material_cost_cents INTEGER,
  labor_minutes INTEGER,
  labor_cost_cents INTEGER,
  remarks TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE tools (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  quantity INTEGER NOT NULL DEFAULT 1,
  brand TEXT,
  model TEXT,
  source TEXT,
  price_cents INTEGER,
  purchased_at TEXT,
  condition TEXT NOT NULL DEFAULT 'good',
  remarks TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE project_fabrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  fabric_id INTEGER NOT NULL REFERENCES fabrics(id) ON DELETE RESTRICT,
  length_used_m REAL NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX project_fabrics_project_idx ON project_fabrics(project_id);
CREATE INDEX project_fabrics_fabric_idx ON project_fabrics(fabric_id);

CREATE TABLE project_patterns (
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pattern_id INTEGER NOT NULL REFERENCES patterns(id) ON DELETE RESTRICT,
  PRIMARY KEY(project_id, pattern_id)
);

CREATE TABLE project_materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE RESTRICT
);
CREATE INDEX project_materials_project_idx ON project_materials(project_id);
CREATE INDEX project_materials_material_idx ON project_materials(material_id);
CREATE UNIQUE INDEX project_materials_project_material_idx
  ON project_materials(project_id, material_id);

CREATE TABLE photos (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL
    CHECK (entity_type IN ('fabric', 'pattern', 'material', 'project', 'tool')),
  entity_id INTEGER NOT NULL,
  original_ext TEXT NOT NULL,
  is_cover INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX photos_entity_idx ON photos(entity_type, entity_id);

CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL
    CHECK (entity_type IN ('fabric', 'pattern', 'material', 'project', 'tool')),
  name TEXT NOT NULL,
  color TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, entity_type, name)
);

CREATE TABLE entity_tags (
  entity_type TEXT NOT NULL
    CHECK (entity_type IN ('fabric', 'pattern', 'material', 'project', 'tool')),
  entity_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY(entity_type, entity_id, tag_id)
);
CREATE INDEX entity_tags_tag_idx ON entity_tags(tag_id);
