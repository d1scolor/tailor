CREATE TABLE tags_scoped (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('fabric','pattern','material','project','tool')),
  name TEXT NOT NULL,
  color TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, entity_type, name)
);

INSERT INTO tags_scoped (user_id, entity_type, name, color, created_at, updated_at)
SELECT tags.user_id, entity_tags.entity_type, tags.name, tags.color, tags.created_at, tags.updated_at
FROM tags
JOIN entity_tags ON entity_tags.tag_id = tags.id
GROUP BY tags.id, entity_tags.entity_type
UNION ALL
SELECT tags.user_id, scopes.entity_type, tags.name, tags.color, tags.created_at, tags.updated_at
FROM tags
CROSS JOIN (
  SELECT 'fabric' AS entity_type
  UNION ALL SELECT 'pattern'
  UNION ALL SELECT 'material'
  UNION ALL SELECT 'project'
  UNION ALL SELECT 'tool'
) AS scopes
WHERE NOT EXISTS (SELECT 1 FROM entity_tags WHERE entity_tags.tag_id = tags.id);

CREATE TABLE entity_tags_scoped (
  entity_type TEXT NOT NULL CHECK(entity_type IN ('fabric','pattern','material','project','tool')),
  entity_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL REFERENCES tags_scoped(id) ON DELETE CASCADE,
  PRIMARY KEY(entity_type, entity_id, tag_id)
);

INSERT INTO entity_tags_scoped (entity_type, entity_id, tag_id)
SELECT entity_tags.entity_type, entity_tags.entity_id, tags_scoped.id
FROM entity_tags
JOIN tags ON tags.id = entity_tags.tag_id
JOIN tags_scoped
  ON tags_scoped.user_id = tags.user_id
  AND tags_scoped.entity_type = entity_tags.entity_type
  AND tags_scoped.name = tags.name;

DROP TABLE entity_tags;
DROP TABLE tags;
ALTER TABLE tags_scoped RENAME TO tags;
ALTER TABLE entity_tags_scoped RENAME TO entity_tags;
CREATE INDEX entity_tags_tag_idx ON entity_tags(tag_id);
