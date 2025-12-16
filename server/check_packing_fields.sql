-- Check if columns exist and what data is in the latest record
SELECT TransID, packing_type, sheets_per_packet, Make, Grade, Brand, created_at 
FROM deal_master 
WHERE TransID = 23617;

-- Also check the structure
SHOW COLUMNS FROM deal_master LIKE '%packing%';
SHOW COLUMNS FROM deal_master LIKE '%sheets%';
