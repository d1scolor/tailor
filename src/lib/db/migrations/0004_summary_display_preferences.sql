ALTER TABLE users
ADD COLUMN fabric_used_value_display INTEGER NOT NULL DEFAULT 0
CHECK (fabric_used_value_display IN (0, 1));

ALTER TABLE users
ADD COLUMN fabric_remaining_value_display INTEGER NOT NULL DEFAULT 0
CHECK (fabric_remaining_value_display IN (0, 1));

ALTER TABLE users
ADD COLUMN project_labor_cost_display INTEGER NOT NULL DEFAULT 0
CHECK (project_labor_cost_display IN (0, 1));
