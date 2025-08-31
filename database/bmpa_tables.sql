-- BMPA Stock Exchange Database Schema
-- All table names prefixed with 'bmpa_'

-- Members table (main user table)
CREATE TABLE bmpa_members (
  member_id int(10) NOT NULL AUTO_INCREMENT,
  mname varchar(100) DEFAULT '',
  email varchar(100) DEFAULT '',
  phone varchar(15) DEFAULT '',
  company_name varchar(100) DEFAULT '',
  address1 varchar(100) DEFAULT '',
  address2 varchar(100) DEFAULT '',
  city varchar(50) DEFAULT '',
  state varchar(50) DEFAULT '',
  password_hash varchar(255) DEFAULT '',
  membership_paid int(1) DEFAULT '0',
  membership_valid_till date DEFAULT '1900-01-01',
  mstatus int(1) DEFAULT '0',
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  bmpa_approval_id int(10) DEFAULT '0',
  approval_datetime datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (member_id),
  UNIQUE KEY email (email)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- OTP verification table
CREATE TABLE bmpa_otp_verification (
  id int(10) NOT NULL AUTO_INCREMENT,
  email varchar(100) NOT NULL,
  otp_code varchar(6) NOT NULL,
  purpose varchar(20) NOT NULL DEFAULT 'login', -- 'login' or 'registration'
  expires_at datetime NOT NULL,
  verified int(1) DEFAULT '0',
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_email_purpose (email, purpose),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Categories table
CREATE TABLE bmpa_categories (
  category_id int(10) NOT NULL AUTO_INCREMENT,
  category_name varchar(100) NOT NULL,
  parent_id int(10) DEFAULT '0',
  description text,
  is_active int(1) DEFAULT '1',
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (category_id),
  INDEX idx_parent_id (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Stock listings table
CREATE TABLE bmpa_stock_listings (
  listing_id int(10) NOT NULL AUTO_INCREMENT,
  seller_id int(10) NOT NULL,
  category_id int(10) NOT NULL,
  title varchar(200) NOT NULL,
  description text,
  quantity int(10) NOT NULL DEFAULT '1',
  unit_price decimal(10,2) NOT NULL DEFAULT '0.00',
  currency varchar(3) DEFAULT 'INR',
  location varchar(100) DEFAULT '',
  condition_type varchar(20) DEFAULT 'new', -- 'new', 'used', 'refurbished'
  images text, -- JSON array of image URLs
  specifications text, -- JSON object of specifications
  status varchar(20) DEFAULT 'active', -- 'active', 'sold', 'inactive'
  views int(10) DEFAULT '0',
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (listing_id),
  FOREIGN KEY (seller_id) REFERENCES bmpa_members(member_id),
  FOREIGN KEY (category_id) REFERENCES bmpa_categories(category_id),
  INDEX idx_seller_id (seller_id),
  INDEX idx_category_id (category_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Orders table
CREATE TABLE bmpa_orders (
  order_id int(10) NOT NULL AUTO_INCREMENT,
  buyer_id int(10) NOT NULL,
  seller_id int(10) NOT NULL,
  listing_id int(10) NOT NULL,
  quantity int(10) NOT NULL DEFAULT '1',
  unit_price decimal(10,2) NOT NULL,
  total_amount decimal(10,2) NOT NULL,
  order_status varchar(20) DEFAULT 'pending', -- 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'
  payment_status varchar(20) DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'refunded'
  buyer_notes text,
  seller_notes text,
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (order_id),
  FOREIGN KEY (buyer_id) REFERENCES bmpa_members(member_id),
  FOREIGN KEY (seller_id) REFERENCES bmpa_members(member_id),
  FOREIGN KEY (listing_id) REFERENCES bmpa_stock_listings(listing_id),
  INDEX idx_buyer_id (buyer_id),
  INDEX idx_seller_id (seller_id),
  INDEX idx_listing_id (listing_id),
  INDEX idx_order_status (order_status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Messages table
CREATE TABLE bmpa_messages (
  message_id int(10) NOT NULL AUTO_INCREMENT,
  sender_id int(10) NOT NULL,
  receiver_id int(10) NOT NULL,
  listing_id int(10) DEFAULT NULL,
  order_id int(10) DEFAULT NULL,
  subject varchar(200) DEFAULT '',
  message_text text NOT NULL,
  is_read int(1) DEFAULT '0',
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (message_id),
  FOREIGN KEY (sender_id) REFERENCES bmpa_members(member_id),
  FOREIGN KEY (receiver_id) REFERENCES bmpa_members(member_id),
  FOREIGN KEY (listing_id) REFERENCES bmpa_stock_listings(listing_id),
  FOREIGN KEY (order_id) REFERENCES bmpa_orders(order_id),
  INDEX idx_sender_id (sender_id),
  INDEX idx_receiver_id (receiver_id),
  INDEX idx_listing_id (listing_id),
  INDEX idx_order_id (order_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Payment transactions table
CREATE TABLE bmpa_payments (
  payment_id int(10) NOT NULL AUTO_INCREMENT,
  member_id int(10) NOT NULL,
  order_id int(10) DEFAULT NULL,
  payment_type varchar(20) NOT NULL, -- 'membership', 'order', 'refund'
  amount decimal(10,2) NOT NULL,
  currency varchar(3) DEFAULT 'INR',
  payment_method varchar(50) DEFAULT '', -- 'stripe', 'razorpay', 'bank_transfer'
  transaction_id varchar(100) DEFAULT '',
  payment_status varchar(20) DEFAULT 'pending', -- 'pending', 'success', 'failed', 'refunded'
  payment_gateway_response text,
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (payment_id),
  FOREIGN KEY (member_id) REFERENCES bmpa_members(member_id),
  FOREIGN KEY (order_id) REFERENCES bmpa_orders(order_id),
  INDEX idx_member_id (member_id),
  INDEX idx_order_id (order_id),
  INDEX idx_payment_type (payment_type),
  INDEX idx_payment_status (payment_status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Admin logs table
CREATE TABLE bmpa_admin_logs (
  log_id int(10) NOT NULL AUTO_INCREMENT,
  admin_id int(10) NOT NULL,
  action varchar(100) NOT NULL,
  target_type varchar(50) DEFAULT '', -- 'member', 'listing', 'order', 'category'
  target_id int(10) DEFAULT '0',
  description text,
  ip_address varchar(45) DEFAULT '',
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (log_id),
  FOREIGN KEY (admin_id) REFERENCES bmpa_members(member_id),
  INDEX idx_admin_id (admin_id),
  INDEX idx_action (action),
  INDEX idx_target_type (target_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Session management table
CREATE TABLE bmpa_sessions (
  session_id varchar(128) NOT NULL,
  member_id int(10) DEFAULT NULL,
  session_data text,
  expires_at datetime NOT NULL,
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (session_id),
  FOREIGN KEY (member_id) REFERENCES bmpa_members(member_id),
  INDEX idx_member_id (member_id),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Insert default categories
INSERT INTO bmpa_categories (category_name, description) VALUES
('Printing Machines', 'Offset printing machines, digital printers, and other printing equipment'),
('Paper & Substrates', 'All types of paper, cardboard, and printing substrates'),
('Inks & Chemicals', 'Printing inks, chemicals, and consumables'),
('Binding Equipment', 'Binding machines, finishing equipment'),
('Pre-Press Equipment', 'Plate making, design software, and pre-press tools'),
('Post-Press Equipment', 'Cutting, folding, and finishing machines'),
('Raw Materials', 'General raw materials for printing industry'),
('Spare Parts', 'Machine parts and components'),
('Software & Technology', 'Printing software and technology solutions'),
('Other Equipment', 'Miscellaneous printing industry equipment');

-- Insert default admin user (you can modify this)
INSERT INTO bmpa_members (mname, email, phone, company_name, password_hash, membership_paid, membership_valid_till, mstatus, bmpa_approval_id) VALUES
('BMPA Admin', 'admin@bmpa.org', '9999999999', 'BMPA Organization', '$2b$10$hashedpassword', 1, '2025-12-31', 1, 1);