-- Add Paper category to stock_groups table
-- Paper: up to 175 GSM

INSERT INTO stock_groups (GroupName, IsActive) VALUES
('Paper', 1);

-- Verify the insertion
SELECT GroupID, GroupName FROM stock_groups WHERE GroupName = 'Paper';