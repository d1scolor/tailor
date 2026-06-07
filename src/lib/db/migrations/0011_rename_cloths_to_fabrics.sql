PRAGMA foreign_keys = ON;

ALTER TABLE cloths RENAME TO fabrics;
ALTER TABLE project_cloths RENAME TO project_fabrics;
ALTER TABLE project_fabrics RENAME COLUMN cloth_id TO fabric_id;

DROP INDEX IF EXISTS project_cloths_project_idx;
DROP INDEX IF EXISTS project_cloths_cloth_idx;
CREATE INDEX IF NOT EXISTS project_fabrics_project_idx ON project_fabrics(project_id);
CREATE INDEX IF NOT EXISTS project_fabrics_fabric_idx ON project_fabrics(fabric_id);

CREATE TABLE photos_next (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('fabric','pattern','material','project','tool')),
  entity_id INTEGER NOT NULL,
  original_ext TEXT NOT NULL,
  is_cover INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
INSERT INTO photos_next (
  id,
  user_id,
  entity_type,
  entity_id,
  original_ext,
  is_cover,
  sort_order,
  created_at
)
SELECT
  id,
  user_id,
  CASE entity_type WHEN 'cloth' THEN 'fabric' ELSE entity_type END,
  entity_id,
  original_ext,
  is_cover,
  sort_order,
  created_at
FROM photos;
DROP TABLE photos;
ALTER TABLE photos_next RENAME TO photos;
CREATE INDEX IF NOT EXISTS photos_entity_idx ON photos(entity_type, entity_id);

CREATE TABLE entity_tags_next (
  entity_type TEXT NOT NULL CHECK(entity_type IN ('fabric','pattern','material','project','tool')),
  entity_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY(entity_type, entity_id, tag_id)
);
INSERT INTO entity_tags_next (entity_type, entity_id, tag_id)
SELECT
  CASE entity_type WHEN 'cloth' THEN 'fabric' ELSE entity_type END,
  entity_id,
  tag_id
FROM entity_tags;
DROP TABLE entity_tags;
ALTER TABLE entity_tags_next RENAME TO entity_tags;
CREATE INDEX IF NOT EXISTS entity_tags_tag_idx ON entity_tags(tag_id);
