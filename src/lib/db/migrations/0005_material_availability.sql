ALTER TABLE materials
ADD COLUMN is_used_up INTEGER NOT NULL DEFAULT 0
CHECK (is_used_up IN (0, 1));

UPDATE materials
SET is_used_up = CASE WHEN usage_status = 'used' THEN 1 ELSE 0 END;

ALTER TABLE materials DROP COLUMN usage_status;
