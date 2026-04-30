PRAGMA foreign_keys = ON;

ALTER TABLE cloths ADD COLUMN purpose TEXT NOT NULL DEFAULT 'garment';
ALTER TABLE cloths ADD COLUMN material_type TEXT NOT NULL DEFAULT '其他';
