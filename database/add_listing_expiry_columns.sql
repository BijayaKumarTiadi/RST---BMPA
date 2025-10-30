-- Add columns to deal_master for auto-deletion and reactivation tracking
-- Listings will be auto-deleted after 90 days of inactivity
-- Reactivation is allowed only 2 times

ALTER TABLE deal_master
ADD COLUMN IF NOT EXISTS last_active_date DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Last time listing was active or reactivated',
ADD COLUMN IF NOT EXISTS reactivation_count INT DEFAULT 0 COMMENT 'Number of times listing has been reactivated (max 2)',
ADD COLUMN IF NOT EXISTS expiry_date DATETIME DEFAULT (CURRENT_TIMESTAMP + INTERVAL 90 DAY) COMMENT 'Date when listing will be auto-deleted if inactive',
ADD COLUMN IF NOT EXISTS auto_deleted TINYINT(1) DEFAULT 0 COMMENT 'Flag to mark auto-deleted listings';

-- Create index for efficient auto-deletion queries
CREATE INDEX IF NOT EXISTS idx_expiry_date ON deal_master(expiry_date, StockStatus);

-- Update existing active listings with expiry dates
UPDATE deal_master 
SET last_active_date = COALESCE(updated_at, created_at),
    expiry_date = DATE_ADD(COALESCE(updated_at, created_at), INTERVAL 90 DAY)
WHERE StockStatus = 1 AND expiry_date IS NULL;

-- Verify the changes
SELECT 
    'Columns added successfully' as status,
    COUNT(*) as total_listings,
    SUM(CASE WHEN StockStatus = 1 THEN 1 ELSE 0 END) as active_listings,
    SUM(CASE WHEN expiry_date IS NOT NULL THEN 1 ELSE 0 END) as listings_with_expiry
FROM deal_master;