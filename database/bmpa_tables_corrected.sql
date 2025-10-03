-- BMPA Stock Exchange Database Tables - CORRECTED VERSION
-- Run these queries in your MySQL database to create all required tables
-- This version matches the application's expected column names

-- 1. Members table (main user table) - Updated to match app expectations
CREATE TABLE bmpa_members (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    mname VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    address1 TEXT NOT NULL,
    address2 TEXT,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    member_status ENUM('pending', 'approved', 'rejected', 'suspended') DEFAULT 'pending',
    member_type ENUM('buyer', 'seller', 'both') DEFAULT 'buyer',
    join_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. OTP verification table - Updated column names
CREATE TABLE bmpa_otp_verification (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose ENUM('registration', 'login', 'password_reset') NOT NULL,
    expires_at DATETIME NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_otp_purpose (otp_code, purpose),
    INDEX idx_expires (expires_at)
);

-- 3. Categories table - Updated to use 'id' instead of 'category_id'
CREATE TABLE bmpa_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id INT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES bmpa_categories(id) ON DELETE SET NULL
);

-- 4. Stock listings table - Updated column names
CREATE TABLE bmpa_stock_listings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    seller_id INT NOT NULL,
    category_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    quantity INT NOT NULL,
    unit VARCHAR(50) NOT NULL,
    price_per_unit DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    location VARCHAR(255) NOT NULL,
    condition_type ENUM('new', 'used', 'refurbished') DEFAULT 'new',
    availability_status ENUM('available', 'sold', 'reserved', 'expired') DEFAULT 'available',
    images JSON,
    specifications JSON,
    expiry_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES bmpa_members(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES bmpa_categories(id) ON DELETE RESTRICT,
    INDEX idx_seller (seller_id),
    INDEX idx_category (category_id),
    INDEX idx_status (availability_status),
    INDEX idx_location (location),
    INDEX idx_created (created_at)
);

-- 5. Orders table - Updated column names
CREATE TABLE bmpa_orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    buyer_id INT NOT NULL,
    seller_id INT NOT NULL,
    listing_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    order_status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'disputed') DEFAULT 'pending',
    payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
    payment_method VARCHAR(100),
    shipping_address TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_id) REFERENCES bmpa_members(id) ON DELETE RESTRICT,
    FOREIGN KEY (seller_id) REFERENCES bmpa_members(id) ON DELETE RESTRICT,
    FOREIGN KEY (listing_id) REFERENCES bmpa_stock_listings(id) ON DELETE RESTRICT,
    INDEX idx_buyer (buyer_id),
    INDEX idx_seller (seller_id),
    INDEX idx_listing (listing_id),
    INDEX idx_status (order_status),
    INDEX idx_created (created_at)
);

-- 6. Messages table - Updated column names
CREATE TABLE bmpa_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    listing_id INT,
    order_id INT,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    message_type ENUM('inquiry', 'order', 'support', 'general') DEFAULT 'general',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES bmpa_members(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES bmpa_members(id) ON DELETE CASCADE,
    FOREIGN KEY (listing_id) REFERENCES bmpa_stock_listings(id) ON DELETE SET NULL,
    FOREIGN KEY (order_id) REFERENCES bmpa_orders(id) ON DELETE SET NULL,
    INDEX idx_sender (sender_id),
    INDEX idx_receiver (receiver_id),
    INDEX idx_listing (listing_id),
    INDEX idx_order (order_id),
    INDEX idx_created (created_at)
);

-- 7. Payments table - Updated column names
CREATE TABLE bmpa_payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    member_id INT NOT NULL,
    order_id INT,
    payment_type ENUM('membership', 'order', 'commission') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(100),
    payment_gateway VARCHAR(100),
    transaction_id VARCHAR(255),
    payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    gateway_response JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES bmpa_members(id) ON DELETE RESTRICT,
    FOREIGN KEY (order_id) REFERENCES bmpa_orders(id) ON DELETE SET NULL,
    INDEX idx_member (member_id),
    INDEX idx_order (order_id),
    INDEX idx_transaction (transaction_id),
    INDEX idx_status (payment_status),
    INDEX idx_created (created_at)
);

-- 8. Search queries table - Updated column names
CREATE TABLE bmpa_search_queries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    search_term VARCHAR(255) NOT NULL,
    category_id INT,
    location VARCHAR(255),
    results_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES bmpa_members(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES bmpa_categories(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_term (search_term),
    INDEX idx_created (created_at)
);

-- 9. Admin logs table - Updated column names
CREATE TABLE bmpa_admin_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id INT NOT NULL,
    action VARCHAR(255) NOT NULL,
    target_type ENUM('member', 'listing', 'order', 'category', 'payment') NOT NULL,
    target_id INT,
    details JSON,
    ip_address VARCHAR(45),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES bmpa_members(id) ON DELETE RESTRICT,
    INDEX idx_admin (admin_id),
    INDEX idx_action (action),
    INDEX idx_target (target_type, target_id),
    INDEX idx_created (created_at)
);

-- 10. Sessions table (for user sessions) - Express-session compatible
CREATE TABLE bmpa_sessions (
    session_id VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
    expires INT UNSIGNED NOT NULL,
    data MEDIUMTEXT COLLATE utf8mb4_bin,
    PRIMARY KEY (session_id)
);

-- Insert sample categories
INSERT INTO bmpa_categories (name, description) VALUES
('Printing Papers', 'Various types of printing papers and substrates'),
('Printing Inks', 'Offset, digital, and specialty printing inks'),
('Printing Machinery', 'Offset presses, digital printers, and equipment'),
('Binding Materials', 'Binding supplies, covers, and finishing materials'),
('Pre-Press Equipment', 'Plate making, proofing, and pre-press tools'),
('Consumables', 'General printing consumables and supplies'),
('Used Equipment', 'Second-hand printing machinery and tools');

-- Insert sample subcategories
INSERT INTO bmpa_categories (name, description, parent_id) VALUES
('Coated Papers', 'Art papers, matt papers, gloss papers', 1),
('Uncoated Papers', 'Newsprint, book papers, writing papers', 1),
('Specialty Papers', 'Security papers, carbonless, synthetic papers', 1),
('Offset Inks', 'Sheet-fed and web offset inks', 2),
('Digital Inks', 'Inkjet and laser printer inks', 2),
('Sheet-Fed Presses', 'Single and multi-color sheet-fed machines', 3),
('Web Presses', 'Roll-fed printing presses', 3),
('Digital Presses', 'Digital printing machines', 3);

-- Create additional indexes for better performance
CREATE INDEX idx_email ON bmpa_members (email);
CREATE INDEX idx_member_status ON bmpa_members (member_status);
CREATE INDEX idx_member_type ON bmpa_members (member_type);
CREATE INDEX idx_price ON bmpa_stock_listings (price_per_unit);
CREATE INDEX idx_total_amount ON bmpa_orders (total_amount);

-- Create full-text search indexes for better search performance
ALTER TABLE bmpa_stock_listings ADD FULLTEXT(title, description);
ALTER TABLE bmpa_categories ADD FULLTEXT(name, description);

COMMIT;

-- ========================================
-- TROUBLESHOOTING NOTES:
-- ========================================
-- 1. Make sure your MySQL server allows connections from your Replit IP
-- 2. Check that the database user has all necessary permissions:
--    GRANT ALL PRIVILEGES ON your_database.* TO 'your_user'@'%';
-- 3. Verify the connection details in your .env or database config
-- 4. Test connection manually: mysql -h $DB_HOST -u $DB_USER -p
-- ========================================