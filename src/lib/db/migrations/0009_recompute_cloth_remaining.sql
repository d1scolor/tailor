UPDATE cloths
SET length_remaining = MAX(
  length_total - COALESCE((SELECT SUM(length_used) FROM project_cloths WHERE cloth_id = cloths.id), 0),
  0
);
