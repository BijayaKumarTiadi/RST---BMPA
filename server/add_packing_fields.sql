-- Add Packing Type and Sheets Per Packet columns to deal_master table

ALTER TABLE deal_master 
ADD COLUMN packing_type VARCHAR(50) NULL COMMENT 'Original MILL Packing or Repack by the seller',
ADD COLUMN sheets_per_packet VARCHAR(20) NULL COMMENT '50/72/100/144/150/200/250/500/Others';

-- Update existing records to have default values (optional)
-- UPDATE deal_master SET packing_type = 'Original MILL Packing' WHERE packing_type IS NULL;
