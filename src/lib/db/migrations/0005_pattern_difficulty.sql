PRAGMA foreign_keys = ON;

ALTER TABLE patterns ADD COLUMN difficulty TEXT NOT NULL DEFAULT 'medium';
