-- This script will only delete products from deal_master
-- It will NOT delete spare parts

-- First, check if there are any spare parts (for safety)
SELECT 
    COUNT(*) as spare_part_count,
    'These spare parts will be preserved' as note
FROM deal_master 
WHERE is_spare_part = 1;

-- Delete only regular products (where is_spare_part is NOT 1)
DELETE FROM deal_master 
WHERE is_spare_part != 1 OR is_spare_part IS NULL;

-- Show remaining count
SELECT 
    COUNT(*) as remaining_spare_parts,
    'Spare parts preserved successfully' as status
FROM deal_master 
WHERE is_spare_part = 1;