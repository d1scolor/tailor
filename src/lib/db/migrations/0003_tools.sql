PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tools (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '其他',
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

CREATE TABLE photos_next (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('cloth','pattern','material','project','tool')),
  entity_id INTEGER NOT NULL,
  original_ext TEXT NOT NULL,
  is_cover INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
INSERT INTO photos_next SELECT * FROM photos;
DROP TABLE photos;
ALTER TABLE photos_next RENAME TO photos;
CREATE INDEX IF NOT EXISTS photos_entity_idx ON photos(entity_type, entity_id);

CREATE TABLE entity_tags_next (
  entity_type TEXT NOT NULL CHECK(entity_type IN ('cloth','pattern','material','project','tool')),
  entity_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY(entity_type, entity_id, tag_id)
);
INSERT INTO entity_tags_next SELECT * FROM entity_tags;
DROP TABLE entity_tags;
ALTER TABLE entity_tags_next RENAME TO entity_tags;
CREATE INDEX IF NOT EXISTS entity_tags_tag_idx ON entity_tags(tag_id);
