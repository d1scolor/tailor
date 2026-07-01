PRAGMA foreign_keys = ON;

UPDATE users SET unit_system = 'imperial' WHERE unit_system = 'us';

CREATE TABLE material_units_next (
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

INSERT INTO material_units_next (id, user_id, definition_key, custom_name, active, sort_order, created_at)
SELECT
  id,
  user_id,
  CASE name
    WHEN '个' THEN 'piece'
    WHEN '米' THEN 'lengthLong'
    WHEN '厘米' THEN 'lengthShort'
    WHEN '团' THEN 'ball'
    WHEN '轴' THEN 'spool'
    WHEN '包' THEN 'pack'
    WHEN '卷' THEN 'roll'
    WHEN '克' THEN 'massSmall'
    ELSE NULL
  END,
  CASE
    WHEN name IN ('个', '米', '厘米', '团', '轴', '包', '卷', '克') THEN NULL
    ELSE name
  END,
  1,
  sort_order,
  created_at
FROM material_units;

INSERT INTO material_units_next (user_id, definition_key, active, sort_order, created_at)
SELECT users.id, 'unspecified', 0, 999, users.created_at
FROM users;

INSERT INTO material_units_next (user_id, definition_key, active, sort_order, created_at)
WITH defaults(definition_key, sort_order) AS (
  VALUES
    ('piece', 0),
    ('lengthLong', 1),
    ('lengthShort', 2),
    ('ball', 3),
    ('spool', 4),
    ('pack', 5),
    ('roll', 6),
    ('massSmall', 7)
)
SELECT users.id, defaults.definition_key, 0, defaults.sort_order, users.created_at
FROM users
CROSS JOIN defaults
WHERE NOT EXISTS (
  SELECT 1 FROM material_units_next
  WHERE material_units_next.user_id = users.id
    AND material_units_next.definition_key = defaults.definition_key
);

INSERT INTO material_units_next (user_id, definition_key, active, sort_order, created_at)
SELECT users.id, 'massLarge', 1, 8, users.created_at
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM material_units_next
  WHERE material_units_next.user_id = users.id
    AND material_units_next.definition_key = 'massLarge'
);

CREATE TABLE material_categories_next (
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

INSERT INTO material_categories_next (id, user_id, definition_key, custom_name, active, sort_order, created_at)
SELECT
  id,
  user_id,
  CASE name
    WHEN '线' THEN 'thread'
    WHEN '纽扣' THEN 'button'
    WHEN '拉链' THEN 'zipper'
    WHEN '松紧带' THEN 'elastic'
    WHEN '衬布' THEN 'interfacing'
    WHEN '织带' THEN 'ribbon'
    WHEN '蕾丝' THEN 'lace'
    WHEN '花边' THEN 'trim'
    WHEN '包边条' THEN 'biasTape'
    WHEN '按扣' THEN 'snap'
    WHEN '钩眼扣' THEN 'hookAndEye'
    WHEN '魔术贴' THEN 'velcro'
    WHEN '其他' THEN 'other'
    ELSE NULL
  END,
  CASE
    WHEN name IN ('线', '纽扣', '拉链', '松紧带', '衬布', '织带', '蕾丝', '花边', '包边条', '按扣', '钩眼扣', '魔术贴', '其他') THEN NULL
    ELSE name
  END,
  1,
  sort_order,
  created_at
FROM material_categories;

INSERT INTO material_categories_next (user_id, definition_key, active, sort_order, created_at)
WITH defaults(definition_key, sort_order) AS (
  VALUES
    ('thread', 0),
    ('button', 1),
    ('zipper', 2),
    ('elastic', 3),
    ('interfacing', 4),
    ('ribbon', 5),
    ('lace', 6),
    ('trim', 7),
    ('biasTape', 8),
    ('snap', 9),
    ('hookAndEye', 10),
    ('velcro', 11),
    ('other', 12)
)
SELECT users.id, defaults.definition_key, 0, defaults.sort_order, users.created_at
FROM users
CROSS JOIN defaults
WHERE NOT EXISTS (
  SELECT 1 FROM material_categories_next
  WHERE material_categories_next.user_id = users.id
    AND material_categories_next.definition_key = defaults.definition_key
);

CREATE TABLE materials_next (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category_id INTEGER REFERENCES material_categories_next(id) ON DELETE SET NULL,
  unit_id INTEGER NOT NULL REFERENCES material_units_next(id) ON DELETE RESTRICT,
  quantity_total_canonical REAL NOT NULL,
  usage_status TEXT NOT NULL DEFAULT 'available',
  colors TEXT NOT NULL DEFAULT '[]',
  source TEXT,
  price_cents INTEGER,
  purchased_at TEXT,
  remarks TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO materials_next (
  id, user_id, name, category_id, unit_id, quantity_total_canonical,
  usage_status, colors, source, price_cents, purchased_at, remarks, created_at, updated_at
)
SELECT
  materials.id,
  materials.user_id,
  materials.name,
  materials.category_id,
  COALESCE(
    materials.unit_id,
    (
      SELECT id FROM material_units_next
      WHERE user_id = materials.user_id AND definition_key = 'unspecified'
    )
  ),
  CASE material_units.name
    WHEN '厘米' THEN materials.quantity_total / 100.0
    WHEN '克' THEN materials.quantity_total / 1000.0
    ELSE materials.quantity_total
  END,
  materials.usage_status,
  materials.colors,
  materials.source,
  materials.price_cents,
  materials.purchased_at,
  materials.remarks,
  materials.created_at,
  materials.updated_at
FROM materials
LEFT JOIN material_units ON material_units.id = materials.unit_id;

CREATE TABLE project_materials_next (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  material_id INTEGER NOT NULL REFERENCES materials_next(id) ON DELETE RESTRICT
);

INSERT INTO project_materials_next (id, project_id, material_id)
SELECT id, project_id, material_id
FROM project_materials;

DROP TABLE project_materials;
DROP TABLE materials;
DROP TABLE material_units;
DROP TABLE material_categories;
ALTER TABLE material_units_next RENAME TO material_units;
ALTER TABLE material_categories_next RENAME TO material_categories;
ALTER TABLE materials_next RENAME TO materials;
ALTER TABLE project_materials_next RENAME TO project_materials;

CREATE UNIQUE INDEX material_units_user_definition
  ON material_units(user_id, definition_key)
  WHERE definition_key IS NOT NULL;
CREATE UNIQUE INDEX material_units_user_custom_name
  ON material_units(user_id, custom_name)
  WHERE custom_name IS NOT NULL;
CREATE UNIQUE INDEX material_categories_user_definition
  ON material_categories(user_id, definition_key)
  WHERE definition_key IS NOT NULL;
CREATE UNIQUE INDEX material_categories_user_custom_name
  ON material_categories(user_id, custom_name)
  WHERE custom_name IS NOT NULL;
CREATE INDEX project_materials_project_idx ON project_materials(project_id);
CREATE INDEX project_materials_material_idx ON project_materials(material_id);
CREATE UNIQUE INDEX project_materials_project_material_idx ON project_materials(project_id, material_id);

CREATE TABLE fabrics_next (
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

INSERT INTO fabrics_next (
  id, user_id, name, quantity, length_total_m, width_m, colors, purpose,
  material_type, source, price_cents, purchased_at, remarks, created_at, updated_at
)
SELECT
  id,
  user_id,
  name,
  quantity,
  CASE length_unit
    WHEN 'yd' THEN length_total * 0.9144
    WHEN 'cm' THEN length_total / 100.0
    ELSE length_total
  END,
  CASE width_unit
    WHEN 'in' THEN width * 0.0254
    WHEN 'cm' THEN width / 100.0
    ELSE width
  END,
  colors,
  purpose,
  material_type,
  source,
  price_cents,
  purchased_at,
  remarks,
  created_at,
  updated_at
FROM fabrics;

CREATE TABLE project_fabrics_next (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  fabric_id INTEGER NOT NULL REFERENCES fabrics_next(id) ON DELETE RESTRICT,
  length_used_m REAL NOT NULL,
  created_at TEXT NOT NULL
);

INSERT INTO project_fabrics_next (id, project_id, fabric_id, length_used_m, created_at)
SELECT
  project_fabrics.id,
  project_fabrics.project_id,
  project_fabrics.fabric_id,
  CASE fabrics.length_unit
    WHEN 'yd' THEN project_fabrics.length_used * 0.9144
    WHEN 'cm' THEN project_fabrics.length_used / 100.0
    ELSE project_fabrics.length_used
  END,
  project_fabrics.created_at
FROM project_fabrics
JOIN fabrics ON fabrics.id = project_fabrics.fabric_id;

DROP TABLE project_fabrics;
DROP TABLE fabrics;
ALTER TABLE fabrics_next RENAME TO fabrics;
ALTER TABLE project_fabrics_next RENAME TO project_fabrics;
CREATE INDEX project_fabrics_project_idx ON project_fabrics(project_id);
CREATE INDEX project_fabrics_fabric_idx ON project_fabrics(fabric_id);
