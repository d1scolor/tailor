ALTER TABLE users
ADD COLUMN inventory_page_size TEXT NOT NULL DEFAULT '20'
CHECK (inventory_page_size IN ('20', '50', '100', 'all'));
