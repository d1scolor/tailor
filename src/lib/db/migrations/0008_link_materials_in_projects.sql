PRAGMA foreign_keys = ON;

ALTER TABLE materials ADD COLUMN usage_status TEXT NOT NULL DEFAULT 'available';

UPDATE materials
SET quantity_remaining = MIN(
  quantity_total,
  quantity_remaining + COALESCE(
    (
      SELECT SUM(pm.quantity_used)
      FROM project_materials pm
      WHERE pm.material_id = materials.id
    ),
    0
  )
);

CREATE TABLE project_materials_next (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE RESTRICT
);

INSERT INTO project_materials_next (id, project_id, material_id)
SELECT MIN(id), project_id, material_id
FROM project_materials
GROUP BY project_id, material_id;

DROP TABLE project_materials;
ALTER TABLE project_materials_next RENAME TO project_materials;
CREATE INDEX IF NOT EXISTS project_materials_project_idx ON project_materials(project_id);
CREATE INDEX IF NOT EXISTS project_materials_material_idx ON project_materials(material_id);
CREATE UNIQUE INDEX IF NOT EXISTS project_materials_project_material_idx ON project_materials(project_id, material_id);
