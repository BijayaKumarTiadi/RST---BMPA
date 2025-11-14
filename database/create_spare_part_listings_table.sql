-- Create spare_part_listings table
-- This table stores actual spare part listings posted by sellers

CREATE TABLE IF NOT EXISTS spare_part_listings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seller_id INT NOT NULL,
    process VARCHAR(100) NOT NULL,
    category_type VARCHAR(100) NOT NULL,
    machine_type VARCHAR(100) NOT NULL,
    manufacturer VARCHAR(100) NOT NULL,
    model VARCHAR(100),
    part_name VARCHAR(255) NOT NULL,
    part_no VARCHAR(100) NOT NULL,
    pcs INT NOT NULL DEFAULT 1,
    unit VARCHAR(50) NOT NULL DEFAULT 'Piece',
    stock_age INT DEFAULT 0,
    seller_comments TEXT,
    status ENUM('active', 'sold', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES bmpa_members(member_id) ON DELETE CASCADE,
    INDEX idx_seller (seller_id),
    INDEX idx_process (process),
    INDEX idx_category (category_type),
    INDEX idx_machine (machine_type),
    INDEX idx_manufacturer (manufacturer),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;