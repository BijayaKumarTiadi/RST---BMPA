-- Update spare_part_categories table with new data
-- This migration clears old data and inserts the new Process -> Manufacturer relationships

-- First, delete all existing data
DELETE FROM spare_part_categories;

-- Reset auto increment
ALTER TABLE spare_part_categories AUTO_INCREMENT = 1;

-- Insert new spare part categories data
-- Note: Manufacturer is linked to Process as per the requirements

-- PRINTING process
INSERT INTO spare_part_categories (process, machine_type, manufacturer, category_type, model) VALUES
('Printing', 'Offset', 'Heidelberg', 'Electronics', 'Speedmaster'),
('Printing', 'Offset', 'Komori', NULL, 'Lithrone'),
('Printing', 'Flexo', 'Konica Minolta', NULL, NULL),
('Printing', 'Digital', 'Xerox', NULL, NULL),
('Printing', 'Offset', 'HP', 'Mechanical', 'Speedmaster'),
('Printing', 'Offset', 'Man Roland', NULL, '700'),
('Printing', 'Offset', 'K&B', NULL, NULL),
('Printing', 'Flexo', 'Ryobi', NULL, NULL),
('Printing', 'Punching', 'Mistsubishi', NULL, NULL),
('Printing', 'Offset', 'Planeta', 'Pneumatic', NULL),
('Printing', 'Offset', 'Dominant', NULL, NULL),
('Printing', 'Flexo', 'Canon', NULL, NULL),
('Printing', 'Screen', 'OTHER', NULL, NULL),
('Printing', NULL, 'RICOH', NULL, NULL),
('Printing', NULL, 'SAKURAI', NULL, NULL),
('Printing', NULL, 'OTHER', NULL, NULL);

-- BINDING process
INSERT INTO spare_part_categories (process, machine_type, manufacturer, category_type, model) VALUES
('Binding', 'Perfect Binding', 'Kolbus', 'Mechanical', NULL),
('Binding', 'Saddle Stitch', 'Muller Martini', 'Electronics', NULL),
('Binding', NULL, 'OTHER', 'Pneumatic', NULL);

-- COATING process
INSERT INTO spare_part_categories (process, machine_type, manufacturer, category_type, model) VALUES
('COATING', NULL, NULL, 'Electronics', NULL),
('COATING', NULL, NULL, 'Mechanical', NULL),
('COATING', NULL, NULL, 'Pneumatic', NULL);

-- LAMINATION process
INSERT INTO spare_part_categories (process, machine_type, manufacturer, category_type, model) VALUES
('LAMINATION', NULL, NULL, 'Electronics', NULL),
('LAMINATION', 'Thermal', NULL, 'Mechanical', NULL),
('LAMINATION', 'Cold', NULL, 'Pneumatic', NULL);

-- PUNCHING process
INSERT INTO spare_part_categories (process, machine_type, manufacturer, category_type, model) VALUES
('PUNCHING', 'Die Cutting', 'Bobst', 'Electronics', NULL),
('PUNCHING', NULL, 'DGM', 'Mechanical', NULL),
('PUNCHING', 'Flatbed', 'OTHER', 'Pneumatic', NULL);

-- PASTING process
INSERT INTO spare_part_categories (process, machine_type, manufacturer, category_type, model) VALUES
('PASTING', 'Folder Gluer', 'Bobst', 'Electronics', NULL),
('PASTING', NULL, 'DGM', 'Mechanical', NULL),
('PASTING', 'Box Making', 'Kolbus', 'Pneumatic', NULL),
('PASTING', NULL, 'ACME', NULL, NULL);

-- WINDOW PATCHING process
INSERT INTO spare_part_categories (process, machine_type, manufacturer, category_type, model) VALUES
('WINDOW PATCHING', 'Window Patcher', 'Bobst', 'Electronics', NULL),
('WINDOW PATCHING', NULL, 'KOHMANN', 'Mechanical', NULL),
('WINDOW PATCHING', 'Film Applicator', 'Heiber Schroder', 'Pneumatic', NULL),
('WINDOW PATCHING', NULL, 'JAY Engg', NULL, NULL),
('WINDOW PATCHING', NULL, 'OTHER', NULL, NULL);

-- CORRUGATION process
INSERT INTO spare_part_categories (process, machine_type, manufacturer, category_type, model) VALUES
('CORRUGATION', NULL, NULL, 'Electronics', NULL),
('CORRUGATION', NULL, NULL, 'Mechanical', NULL),
('CORRUGATION', NULL, NULL, 'Pneumatic', NULL);

-- STAMPING process
INSERT INTO spare_part_categories (process, machine_type, manufacturer, category_type, model) VALUES
('STAMPING', NULL, 'Bobst', 'Electronics', NULL),
('STAMPING', NULL, 'BRAUSSE', 'Mechanical', NULL),
('STAMPING', NULL, 'Heidelberg', 'Pneumatic', NULL),
('STAMPING', NULL, 'OTHER', NULL, NULL);

-- OTHERS process
INSERT INTO spare_part_categories (process, machine_type, manufacturer, category_type, model) VALUES
('OTHERS', 'General', 'Various', 'Electronics', NULL),
('OTHERS', 'General', 'Various', 'Mechanical', NULL),
('OTHERS', 'General', 'Various', 'Pneumatic', NULL);

COMMIT;