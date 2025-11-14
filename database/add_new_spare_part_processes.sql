-- Add new processes to spare_part_categories table
-- New processes: PRINTING, COATING, LAMINATION, PUNCHING, PASTING, WINDOW PATCHING, 
-- CORRUGATION, STAMPING, OTHERS, DIGITAL, SCREEN

-- Insert new process entries
INSERT INTO spare_part_categories (process, category_type, machine_type, manufacturer, model) VALUES
-- PRINTING process (already exists but ensuring entries)
('PRINTING', 'Electronics', 'Offset', 'Heidelberg', 'Speedmaster'),
('PRINTING', 'Mechanical', 'Offset', 'Komori', 'Lithrone'),

-- COATING process
('COATING', 'Electronics', 'UV Coating', 'Bobst', NULL),
('COATING', 'Mechanical', 'UV Coating', 'Bobst', NULL),
('COATING', 'Mechanical', 'Laminating', 'Kolbus', NULL),

-- LAMINATION process
('LAMINATION', 'Electronics', 'Thermal', 'GMP', NULL),
('LAMINATION', 'Mechanical', 'Thermal', 'GMP', NULL),
('LAMINATION', 'Mechanical', 'Cold', 'Prakash', NULL),

-- PUNCHING process
('PUNCHING', 'Electronics', 'Die Cutting', 'Bobst', NULL),
('PUNCHING', 'Mechanical', 'Die Cutting', 'Bobst', NULL),
('PUNCHING', 'Mechanical', 'Flatbed', 'Heidelberg', NULL),
('PUNCHING', 'Pneumatic', 'Flatbed', 'Heidelberg', NULL),

-- PASTING process
('PASTING', 'Electronics', 'Folder Gluer', 'Bobst', NULL),
('PASTING', 'Mechanical', 'Folder Gluer', 'Bobst', NULL),
('PASTING', 'Mechanical', 'Box Making', 'Kolbus', NULL),

-- WINDOW PATCHING process
('WINDOW PATCHING', 'Electronics', 'Window Patcher', 'Bobst', NULL),
('WINDOW PATCHING', 'Mechanical', 'Window Patcher', 'Bobst', NULL),
('WINDOW PATCHING', 'Mechanical', 'Film Applicator', 'GMP', NULL),

-- CORRUGATION process
('CORRUGATION', 'Electronics', 'Corrugator', 'BHS', NULL),
('CORRUGATION', 'Mechanical', 'Corrugator', 'BHS', NULL),
('CORRUGATION', 'Mechanical', 'Sheet Plant', 'Mitsubishi', NULL),

-- STAMPING process
('STAMPING', 'Electronics', 'Foil Stamping', 'Bobst', NULL),
('STAMPING', 'Mechanical', 'Foil Stamping', 'Bobst', NULL),
('STAMPING', 'Mechanical', 'Hot Stamping', 'Heidelberg', NULL),

-- OTHERS process
('OTHERS', 'Electronics', 'General', 'Various', NULL),
('OTHERS', 'Mechanical', 'General', 'Various', NULL),
('OTHERS', 'Pneumatic', 'General', 'Various', NULL),

-- DIGITAL process
('DIGITAL', 'Electronics', 'Digital Press', 'HP', 'Indigo'),
('DIGITAL', 'Electronics', 'Digital Press', 'Xerox', 'Versant'),
('DIGITAL', 'Electronics', 'Wide Format', 'Canon', NULL),
('DIGITAL', 'Mechanical', 'Digital Press', 'Ricoh', NULL),

-- SCREEN process
('SCREEN', 'Electronics', 'Screen Printing', 'Sakurai', NULL),
('SCREEN', 'Mechanical', 'Screen Printing', 'Sakurai', NULL),
('SCREEN', 'Mechanical', 'Flatbed Screen', 'Dubuit', NULL);

COMMIT;