ALTER TABLE users ADD COLUMN unit_system TEXT NOT NULL DEFAULT 'metric';

UPDATE project_cloths
SET length_used = (
  SELECT CASE cloths.length_unit
    WHEN 'cm' THEN project_cloths.length_used / 100.0
    WHEN 'yd' THEN project_cloths.length_used * 0.9144
    ELSE project_cloths.length_used
  END
  FROM cloths
  WHERE cloths.id = project_cloths.cloth_id
)
WHERE EXISTS (
  SELECT 1 FROM cloths WHERE cloths.id = project_cloths.cloth_id
);

UPDATE cloths
SET
  length_total = CASE length_unit
    WHEN 'cm' THEN length_total / 100.0
    WHEN 'yd' THEN length_total * 0.9144
    ELSE length_total
  END,
  length_remaining = CASE length_unit
    WHEN 'cm' THEN length_remaining / 100.0
    WHEN 'yd' THEN length_remaining * 0.9144
    ELSE length_remaining
  END,
  length_unit = 'm',
  width = CASE width_unit
    WHEN 'm' THEN width * 100.0
    WHEN 'in' THEN width * 2.54
    ELSE width
  END,
  width_unit = 'cm';

UPDATE cloths
SET length_remaining = MAX(
  length_total - COALESCE((SELECT SUM(length_used) FROM project_cloths WHERE cloth_id = cloths.id), 0),
  0
);
