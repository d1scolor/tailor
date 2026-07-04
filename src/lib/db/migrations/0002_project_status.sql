ALTER TABLE projects
ADD COLUMN status TEXT NOT NULL DEFAULT 'in_progress'
CHECK (status IN ('in_progress', 'completed', 'cancelled'));

UPDATE projects SET status = 'completed';
