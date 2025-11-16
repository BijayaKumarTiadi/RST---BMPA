-- Add company and child user management columns to bmpa_members table
-- This enables one company to have up to 2 child users sharing one membership

-- Add new columns for company/child user management
ALTER TABLE bmpa_members
ADD COLUMN parent_member_id INT DEFAULT NULL COMMENT 'Points to parent member for child users, NULL for parent users',
ADD COLUMN user_type ENUM('parent', 'child') DEFAULT 'parent' COMMENT 'User type: parent (company main account) or child',
ADD COLUMN child_user_name VARCHAR(100) DEFAULT NULL COMMENT 'Name of child user if user_type is child',
ADD COLUMN company_id INT DEFAULT NULL COMMENT 'Company ID - for parent users it equals member_id, for child users it equals parent_member_id';

-- Add foreign key constraint for parent_member_id
ALTER TABLE bmpa_members
ADD CONSTRAINT fk_parent_member FOREIGN KEY (parent_member_id) 
    REFERENCES bmpa_members(member_id) ON DELETE CASCADE;

-- Add indexes for faster lookups
CREATE INDEX idx_parent_member ON bmpa_members(parent_member_id);
CREATE INDEX idx_company_id ON bmpa_members(company_id);
CREATE INDEX idx_user_type ON bmpa_members(user_type);

-- Update existing members to be parent users and set company_id
UPDATE bmpa_members 
SET user_type = 'parent', 
    company_id = member_id,
    parent_member_id = NULL
WHERE parent_member_id IS NULL;

-- Verification queries (commented out, for reference)
-- SELECT member_id, mname, email, user_type, parent_member_id, company_id FROM bmpa_members;
-- SELECT COUNT(*) FROM bmpa_members WHERE user_type = 'parent';
-- SELECT COUNT(*) FROM bmpa_members WHERE user_type = 'child';