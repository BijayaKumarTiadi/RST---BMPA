-- Add Paper Reel to product groups
-- Run this SQL to add Paper Reel as a new product group

INSERT INTO stock_groups (GroupName, IsActive) 
VALUES ('Paper Reel', 1)
ON DUPLICATE KEY UPDATE IsActive = 1;

-- Note: The GroupID will be auto-generated
-- After running this, Paper Reel will appear in the Product Group dropdown
