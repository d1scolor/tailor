PRAGMA foreign_keys = ON;

ALTER TABLE patterns ADD COLUMN pattern_type TEXT NOT NULL DEFAULT '纸质';
