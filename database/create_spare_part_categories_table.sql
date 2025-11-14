-- Create spare_part_categories table
-- This table stores spare part category metadata for the add-product form

CREATE TABLE IF NOT EXISTS spare_part_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    process VARCHAR(100) NOT NULL,
    category_type VARCHAR(100),         -- electronics / mechanical / pneumatic
    machine_type VARCHAR(100),          -- offset / flexo / punching / etc.
    manufacturer VARCHAR(100),          -- heidelberg / k&b / man roland etc.
    model VARCHAR(100),                 -- model names (nullable)
    part_name VARCHAR(255),             -- user will add (nullable - filled by user)
    part_no VARCHAR(100),               -- user will add (nullable - filled by user)
    pcs INT DEFAULT 0,                  -- number of items (nullable - filled by user)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_process (process),
    INDEX idx_category_type (category_type),
    INDEX idx_machine_type (machine_type),
    INDEX idx_manufacturer (manufacturer)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample data for spare part categories
INSERT INTO spare_part_categories (process, category_type, machine_type, manufacturer, model) VALUES
-- Electronics categories
('Printing', 'Electronics', 'Offset', 'Heidelberg', 'Speedmaster'),
('Printing', 'Electronics', 'Offset', 'Komori', 'Lithrone'),
('Printing', 'Electronics', 'Flexo', 'Bobst', NULL),
('Printing', 'Electronics', 'Digital', 'Xerox', NULL),

-- Mechanical categories
('Printing', 'Mechanical', 'Offset', 'Heidelberg', 'Speedmaster'),
('Printing', 'Mechanical', 'Offset', 'Man Roland', '700'),
('Printing', 'Mechanical', 'Offset', 'K&B', NULL),
('Printing', 'Mechanical', 'Flexo', 'Bobst', NULL),
('Printing', 'Mechanical', 'Punching', 'Heidelberg', NULL),

-- Pneumatic categories
('Printing', 'Pneumatic', 'Offset', 'Heidelberg', NULL),
('Printing', 'Pneumatic', 'Offset', 'Komori', NULL),
('Printing', 'Pneumatic', 'Flexo', 'Bobst', NULL),

-- Binding process
('Binding', 'Mechanical', 'Perfect Binding', 'Kolbus', NULL),
('Binding', 'Mechanical', 'Saddle Stitch', 'Muller Martini', NULL),
('Binding', 'Electronics', 'Perfect Binding', 'Kolbus', NULL);

COMMIT;