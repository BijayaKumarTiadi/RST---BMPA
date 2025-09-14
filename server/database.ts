import mysql from 'mysql2/promise';

// Database configuration with environment variable fallbacks
const dbConfig = {
  host: process.env.DB_HOST || '103.155.204.186',
  port: parseInt(process.env.DB_PORT || '23306'),
  user: process.env.DB_USER || 'manish',
  password: process.env.DB_PASSWORD || 'manish',
  database: process.env.DB_NAME || 'trade_bmpa25',
  charset: 'utf8mb4',
  timezone: '+00:00',
  connectTimeout: 30000, // Reduced timeout for faster deployment
  acquireTimeout: 30000,
  timeout: 30000
};

// Create connection pool for better performance
export const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('✅ MySQL database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ MySQL connection failed:', error);
    return false;
  }
}

// Helper function to execute queries
export async function executeQuery<T = any>(
  query: string, 
  params: any[] = []
): Promise<T[]> {
  try {
    const [rows] = await pool.execute(query, params);
    return rows as T[];
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Helper function for single row queries
export async function executeQuerySingle<T = any>(
  query: string, 
  params: any[] = []
): Promise<T | null> {
  const rows = await executeQuery<T>(query, params);
  return rows.length > 0 ? rows[0] : null;
}

// Initialize database and create tables if they don't exist
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('🔄 Initializing database...');
    
    // Test connection first
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to database');
    }

    // Check if bmpa_members table exists, if not create it
    const tableExists = await executeQuerySingle(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'trade_bmpa25' 
      AND table_name = 'bmpa_members'
    `);

    if (!tableExists || tableExists.count === 0) {
      console.log('📋 Creating BMPA tables...');
      
      // Create members table
      await executeQuery(`
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
          role varchar(20) DEFAULT 'both',
          created_at datetime DEFAULT CURRENT_TIMESTAMP,
          bmpa_approval_id int(10) DEFAULT '0',
          approval_datetime datetime DEFAULT CURRENT_TIMESTAMP,
          last_login datetime NULL,
          PRIMARY KEY (member_id),
          UNIQUE KEY email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=latin1
      `);

      // Create OTP verification table
      await executeQuery(`
        CREATE TABLE bmpa_otp_verification (
          id int(10) NOT NULL AUTO_INCREMENT,
          email varchar(100) NOT NULL,
          otp_code varchar(6) NOT NULL,
          purpose varchar(20) NOT NULL DEFAULT 'login',
          expires_at datetime NOT NULL,
          verified int(1) DEFAULT '0',
          created_at datetime DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          INDEX idx_email_purpose (email, purpose),
          INDEX idx_expires_at (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=latin1
      `);

      // Create admin users table
      await executeQuery(`
        CREATE TABLE admin_users (
          admin_id int(10) NOT NULL AUTO_INCREMENT,
          username varchar(50) NOT NULL UNIQUE,
          password_hash varchar(255) NOT NULL,
          full_name varchar(100) NOT NULL,
          email varchar(100) NOT NULL,
          role varchar(20) DEFAULT 'admin',
          is_active int(1) DEFAULT '1',
          last_login datetime NULL,
          created_at datetime DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (admin_id),
          UNIQUE KEY username (username),
          UNIQUE KEY email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=latin1
      `);

      // Create default admin user (username: admin, password: admin)
      const bcrypt = await import('bcryptjs');
      const defaultAdminPassword = await bcrypt.hash('admin', 12);
      
      await executeQuery(`
        INSERT IGNORE INTO admin_users (username, password_hash, full_name, email, role)
        VALUES ('admin', ?, 'System Administrator', 'bktiadi1@gmail.com', 'super_admin')
      `, [defaultAdminPassword]);

      console.log('✅ Database tables created successfully');
      console.log('🔑 Default admin user created (username: admin, password: admin)');
    } else {
      console.log('✅ Database tables already exist');
      
      // Check if role column exists in bmpa_members table, if not add it
      const roleColumnExists = await executeQuerySingle(`
        SELECT COUNT(*) as count 
        FROM information_schema.columns 
        WHERE table_schema = 'trade_bmpa25' 
        AND table_name = 'bmpa_members' 
        AND column_name = 'role'
      `);

      if (!roleColumnExists || roleColumnExists.count === 0) {
        console.log('🔧 Adding role column to bmpa_members table...');
        await executeQuery(`
          ALTER TABLE bmpa_members 
          ADD COLUMN role varchar(20) DEFAULT 'both' 
          AFTER mstatus
        `);
        console.log('✅ Role column added successfully');
      }

      // Update existing users to have 'both' role if they have 'buyer' or 'seller'
      console.log('🔧 Updating existing users to have "both" role...');
      const updateResult = await executeQuery(`
        UPDATE bmpa_members 
        SET role = 'both' 
        WHERE role IN ('buyer', 'seller')
      `);
      const updateInfo = updateResult as any;
      const affectedRows = updateInfo.affectedRows || 0;
      if (affectedRows > 0) {
        console.log(`✅ Updated ${affectedRows} users to have "both" role`);
      } else {
        console.log('ℹ️ No users needed role update');
      }
      
      // Check if admin table exists, if not create it
      const adminTableExists = await executeQuerySingle(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'trade_bmpa25' 
        AND table_name = 'admin_users'
      `);

      if (!adminTableExists || adminTableExists.count === 0) {
        console.log('📋 Creating admin table...');
        
        // Create admin users table
        await executeQuery(`
          CREATE TABLE admin_users (
            admin_id int(10) NOT NULL AUTO_INCREMENT,
            username varchar(50) NOT NULL,
            password_hash varchar(255) NOT NULL,
            full_name varchar(100) NOT NULL,
            email varchar(100) NOT NULL,
            role varchar(20) DEFAULT 'admin',
            is_active int(1) DEFAULT '1',
            last_login datetime NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (admin_id),
            UNIQUE KEY username (username),
            UNIQUE KEY email (email)
          ) ENGINE=InnoDB DEFAULT CHARSET=latin1
        `);

        // Create default admin user
        const bcrypt = await import('bcryptjs');
        const defaultAdminPassword = await bcrypt.hash('admin', 12);
        
        await executeQuery(`
          INSERT INTO admin_users (username, password_hash, full_name, email, role)
          VALUES ('admin', ?, 'System Administrator', 'bktiadi1@gmail.com', 'super_admin')
        `, [defaultAdminPassword]);

        console.log('✅ Admin table created successfully');
        console.log('🔑 Default admin user created (username: admin, password: admin)');
      } else {
        console.log('✅ Admin table already exists');
        
        // Ensure default admin user exists
        try {
          const bcrypt = await import('bcryptjs');
          const defaultAdminPassword = await bcrypt.hash('admin', 12);
          
          await executeQuery(`
            INSERT IGNORE INTO admin_users (username, password_hash, full_name, email, role)
            VALUES ('admin', ?, 'System Administrator', 'bktiadi1@gmail.com', 'super_admin')
          `, [defaultAdminPassword]);

          // Update admin email if needed
          await executeQuery(`
            UPDATE admin_users SET email = 'bktiadi1@gmail.com' WHERE username = 'admin'
          `);
          
          console.log('✅ Default admin user verified');
        } catch (error) {
          console.log('ℹ️ Default admin user already exists');
        }
      }
    }

    // Check if bmpa_categories table exists, if not create it
    const categoriesTableExists = await executeQuerySingle(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'trade_bmpa25' 
      AND table_name = 'bmpa_categories'
    `);

    if (!categoriesTableExists || categoriesTableExists.count === 0) {
      console.log('📋 Creating bmpa_categories table...');
      await executeQuery(`
        CREATE TABLE bmpa_categories (
          category_id int(10) NOT NULL AUTO_INCREMENT,
          category_name varchar(100) NOT NULL,
          parent_id int(10) DEFAULT 0,
          description text,
          is_active int(1) DEFAULT 1,
          created_at datetime DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (category_id),
          KEY parent_id (parent_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=latin1
      `);
      console.log('✅ BMPA Categories table created successfully');
    } else {
      console.log('✅ BMPA Categories table already exists');
    }

    // Add member information columns to deal_master if they don't exist
    const memberInfoColumnExists = await executeQuerySingle(`
      SELECT COUNT(*) as count 
      FROM information_schema.columns 
      WHERE table_schema = DATABASE() 
      AND table_name = 'deal_master' 
      AND column_name = 'created_by_name'
    `);

    if (!memberInfoColumnExists || memberInfoColumnExists.count === 0) {
      console.log('🔧 Adding member information columns to deal_master...');
      await executeQuery(`
        ALTER TABLE deal_master 
        ADD COLUMN created_by_name varchar(100) DEFAULT '',
        ADD COLUMN created_by_company varchar(100) DEFAULT '',
        ADD COLUMN created_by_email varchar(100) DEFAULT '',
        ADD COLUMN created_by_phone varchar(15) DEFAULT ''
      `);
      console.log('✅ Member information columns added to deal_master');
    }

    // Add quantity column to deal_master if it doesn't exist
    const quantityColumnExists = await executeQuerySingle(`
      SELECT COUNT(*) as count 
      FROM information_schema.columns 
      WHERE table_schema = DATABASE() 
      AND table_name = 'deal_master' 
      AND column_name = 'quantity'
    `);

    if (!quantityColumnExists || quantityColumnExists.count === 0) {
      console.log('🔧 Adding quantity column to deal_master...');
      await executeQuery(`
        ALTER TABLE deal_master 
        ADD COLUMN quantity INT DEFAULT 1000
      `);
      console.log('✅ Quantity column added to deal_master');
    }

    // Add stock_description column to deal_master if it doesn't exist
    const stockDescriptionColumnExists = await executeQuerySingle(`
      SELECT COUNT(*) as count 
      FROM information_schema.columns 
      WHERE table_schema = DATABASE() 
      AND table_name = 'deal_master' 
      AND column_name = 'stock_description'
    `);

    if (!stockDescriptionColumnExists || stockDescriptionColumnExists.count === 0) {
      console.log('🔧 Adding stock_description column to deal_master...');
      await executeQuery(`
        ALTER TABLE deal_master 
        ADD COLUMN stock_description TEXT DEFAULT ''
      `);
      console.log('✅ Stock description column added to deal_master');
    }

    // Check if bmpa_products table exists, if not create it
    const productsTableExists = await executeQuerySingle(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'trade_bmpa25' 
      AND table_name = 'bmpa_products'
    `);

    if (!productsTableExists || productsTableExists.count === 0) {
      console.log('📋 Creating bmpa_products table...');
      await executeQuery(`
        CREATE TABLE bmpa_products (
          id varchar(36) PRIMARY KEY,
          seller_id int(10) NOT NULL,
          category_id int(10) NOT NULL,
          title varchar(200) NOT NULL,
          description text,
          price decimal(10,2) NOT NULL,
          quantity int NOT NULL,
          unit varchar(50) NOT NULL,
          min_order_quantity int DEFAULT 1,
          status enum('available', 'low_stock', 'out_of_stock', 'discontinued') DEFAULT 'available',
          specifications json,
          location varchar(100),
          is_active boolean DEFAULT true,
          expiry_date datetime,
          created_at datetime DEFAULT CURRENT_TIMESTAMP,
          updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (seller_id) REFERENCES bmpa_members(member_id) ON DELETE CASCADE,
          FOREIGN KEY (category_id) REFERENCES bmpa_categories(category_id) ON DELETE RESTRICT,
          INDEX idx_seller_id (seller_id),
          INDEX idx_category_id (category_id),
          INDEX idx_status (status),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('✅ BMPA Products table created successfully');

      // Insert default categories
      const defaultCategories = [
        { id: 'cat-1', name: 'Printing Materials', description: 'Paper, ink, toner, and other printing supplies' },
        { id: 'cat-2', name: 'Printing Equipment', description: 'Printers, scanners, and related hardware' },
        { id: 'cat-3', name: 'Binding & Finishing', description: 'Binding machines, laminators, and finishing equipment' },
        { id: 'cat-4', name: 'Office Supplies', description: 'Stationery, folders, and general office materials' },
        { id: 'cat-5', name: 'Digital Services', description: 'Design, printing, and digital solutions' }
      ];

      for (const category of defaultCategories) {
        try {
          await executeQuery(`
            INSERT IGNORE INTO bmpa_categories (category_name, description)
            VALUES (?, ?)
          `, [category.name, category.description]);
        } catch (catError) {
          console.log(`Category ${category.name} might already exist`);
        }
      }
      console.log('✅ Default categories added');
    }



    // Check if deal_master table has user identification columns
    const dealCreatorColumnExists = await executeQuerySingle(`
      SELECT COUNT(*) as count 
      FROM information_schema.columns 
      WHERE table_schema = 'trade_bmpa25' 
      AND table_name = 'deal_master' 
      AND column_name = 'created_by_member_id'
    `);

    if (!dealCreatorColumnExists || dealCreatorColumnExists.count === 0) {
      console.log('📝 Adding user identification columns to deal_master table...');
      
      // Add created_by_member_id column
      await executeQuery(`
        ALTER TABLE deal_master 
        ADD COLUMN created_by_member_id int(10) DEFAULT NULL,
        ADD COLUMN created_by_name varchar(100) DEFAULT '',
        ADD COLUMN created_by_company varchar(100) DEFAULT '',
        ADD COLUMN deal_created_at datetime DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN deal_updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      `);

      // Add foreign key constraint
      await executeQuery(`
        ALTER TABLE deal_master 
        ADD FOREIGN KEY (created_by_member_id) REFERENCES bmpa_members(member_id) ON DELETE SET NULL
      `);
      
      console.log('✅ User identification columns added to deal_master successfully');
    }

    // Check if we need to rename inquiries table to BMPA_inquiries
    const oldInquiriesExists = await executeQuerySingle(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'inquiries'
    `);

    const newInquiriesExists = await executeQuerySingle(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'BMPA_inquiries'
    `);

    if (oldInquiriesExists && oldInquiriesExists.count > 0) {
      if (newInquiriesExists && newInquiriesExists.count > 0) {
        // Drop the new empty BMPA_inquiries table if it exists
        console.log('🗑️ Dropping empty BMPA_inquiries table...');
        await executeQuery('DROP TABLE BMPA_inquiries');
      }
      
      // Rename the existing inquiries table to BMPA_inquiries
      console.log('🔄 Renaming inquiries table to BMPA_inquiries...');
      await executeQuery('RENAME TABLE inquiries TO BMPA_inquiries');
      console.log('✅ Successfully renamed inquiries table to BMPA_inquiries');
    } else if (!newInquiriesExists || newInquiriesExists.count === 0) {
      // Create BMPA_inquiries table if neither exists
      console.log('📧 Creating BMPA_inquiries table...');
      await executeQuery(`
        CREATE TABLE BMPA_inquiries (
          id INT PRIMARY KEY AUTO_INCREMENT,
          product_id INT NOT NULL,
          buyer_name VARCHAR(255) NOT NULL,
          buyer_email VARCHAR(255) NOT NULL,
          buyer_company VARCHAR(255),
          buyer_phone VARCHAR(20),
          quoted_price VARCHAR(50),
          quantity VARCHAR(100),
          message TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_product_id (product_id),
          INDEX idx_buyer_email (buyer_email),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('✅ BMPA_inquiries table created successfully');
    }

    // Add columns to BMPA_inquiries for enhanced tracking
    const inquiryColumnsCheck = await executeQuerySingle(`
      SELECT COUNT(*) as count 
      FROM information_schema.columns 
      WHERE table_schema = DATABASE() 
      AND table_name = 'BMPA_inquiries' 
      AND column_name = 'buyer_id'
    `);
    
    if (inquiryColumnsCheck && inquiryColumnsCheck.count === 0) {
      console.log('🔧 Adding enhanced tracking columns to BMPA_inquiries...');
      await executeQuery(`
        ALTER TABLE BMPA_inquiries 
        ADD COLUMN inquiry_ref VARCHAR(100) UNIQUE AFTER id,
        ADD COLUMN buyer_id INT AFTER inquiry_ref,
        ADD COLUMN seller_id INT AFTER buyer_phone,
        ADD COLUMN seller_name VARCHAR(255) AFTER seller_id,
        ADD COLUMN seller_company VARCHAR(255) AFTER seller_name,
        ADD COLUMN status VARCHAR(50) DEFAULT 'pending' AFTER message,
        ADD INDEX idx_buyer_id (buyer_id),
        ADD INDEX idx_seller_id (seller_id),
        ADD INDEX idx_status (status),
        ADD INDEX idx_inquiry_ref (inquiry_ref)
      `);
      console.log('✅ Enhanced tracking columns added to BMPA_inquiries');
    }
    
    // Check if inquiry_ref column exists in BMPA_inquiries
    const inquiryRefCheck = await executeQuerySingle(`
      SELECT COUNT(*) as count 
      FROM information_schema.columns 
      WHERE table_schema = DATABASE() 
      AND table_name = 'BMPA_inquiries' 
      AND column_name = 'inquiry_ref'
    `);
    
    if (inquiryRefCheck && inquiryRefCheck.count === 0) {
      console.log('🔧 Adding inquiry_ref column to BMPA_inquiries...');
      await executeQuery(`
        ALTER TABLE BMPA_inquiries 
        ADD COLUMN inquiry_ref VARCHAR(100) UNIQUE AFTER id,
        ADD INDEX idx_inquiry_ref (inquiry_ref)
      `);
      console.log('✅ inquiry_ref column added to BMPA_inquiries');
    }
    
    // Create bmpa_received_inquiries table for sellers to track received inquiries
    const receivedInquiriesExists = await executeQuerySingle(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'bmpa_received_inquiries'
    `);
    
    if (!receivedInquiriesExists || receivedInquiriesExists.count === 0) {
      console.log('📨 Creating bmpa_received_inquiries table...');
      await executeQuery(`
        CREATE TABLE bmpa_received_inquiries (
          id INT PRIMARY KEY AUTO_INCREMENT,
          inquiry_ref VARCHAR(100) UNIQUE,
          seller_id INT NOT NULL,
          buyer_id INT NOT NULL,
          buyer_name VARCHAR(255) NOT NULL,
          buyer_email VARCHAR(255) NOT NULL,
          buyer_company VARCHAR(255),
          buyer_phone VARCHAR(20),
          product_id INT NOT NULL,
          product_title VARCHAR(500),
          price_offered VARCHAR(50),
          quantity VARCHAR(100),
          message TEXT,
          status VARCHAR(50) DEFAULT 'open',
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_seller_id (seller_id),
          INDEX idx_buyer_id (buyer_id),
          INDEX idx_product_id (product_id),
          INDEX idx_status (status),
          INDEX idx_is_read (is_read),
          INDEX idx_created_at (created_at),
          INDEX idx_inquiry_ref (inquiry_ref)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('✅ bmpa_received_inquiries table created successfully');
    }
    
    // Add tracking columns to BMPA_members
    const memberTrackingCheck = await executeQuerySingle(`
      SELECT COUNT(*) as count 
      FROM information_schema.columns 
      WHERE table_schema = DATABASE() 
      AND table_name = 'BMPA_members' 
      AND column_name = 'total_inquiries_sent'
    `);
    
    if (memberTrackingCheck && memberTrackingCheck.count === 0) {
      console.log('🔧 Adding inquiry tracking columns to BMPA_members...');
      await executeQuery(`
        ALTER TABLE BMPA_members 
        ADD COLUMN total_inquiries_sent INT DEFAULT 0,
        ADD COLUMN last_inquiry_date TIMESTAMP NULL
      `);
      console.log('✅ Inquiry tracking columns added to BMPA_members');
    }
    
    // Create BMPA_seller_notifications table
    const notificationsTableExists = await executeQuerySingle(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'BMPA_seller_notifications'
    `);
    
    if (!notificationsTableExists || notificationsTableExists.count === 0) {
      console.log('🔔 Creating BMPA_seller_notifications table...');
      await executeQuery(`
        CREATE TABLE BMPA_seller_notifications (
          id INT PRIMARY KEY AUTO_INCREMENT,
          seller_id INT NOT NULL,
          notification_type VARCHAR(50) NOT NULL,
          inquiry_id INT,
          buyer_name VARCHAR(255),
          product_id INT,
          message TEXT,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_seller_id (seller_id),
          INDEX idx_is_read (is_read),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('✅ BMPA_seller_notifications table created successfully');
    }

    // Create BMPA_orders table for actual purchase transactions
    const ordersTableExists = await executeQuerySingle(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'BMPA_orders'
    `);

    if (!ordersTableExists || ordersTableExists.count === 0) {
      console.log('📦 Creating BMPA_orders table...');
      await executeQuery(`
        CREATE TABLE BMPA_orders (
          id INT PRIMARY KEY AUTO_INCREMENT,
          buyer_id INT NOT NULL,
          seller_id INT NOT NULL,
          deal_id INT NOT NULL,
          product_title VARCHAR(500),
          quantity VARCHAR(100),
          unit_price DECIMAL(10, 2),
          total_amount DECIMAL(10, 2),
          status ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
          payment_status ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',
          shipping_address TEXT,
          tracking_number VARCHAR(100),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_buyer_id (buyer_id),
          INDEX idx_seller_id (seller_id),
          INDEX idx_deal_id (deal_id),
          INDEX idx_status (status),
          INDEX idx_created_at (created_at),
          FOREIGN KEY (deal_id) REFERENCES deal_master(TransID)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('✅ BMPA_orders table created successfully');
    }

    // Add search_key column to deal_master if it doesn't exist
    const searchKeyColumnExists = await executeQuerySingle(`
      SELECT COUNT(*) as count 
      FROM information_schema.columns 
      WHERE table_schema = 'trade_bmpa25' 
      AND table_name = 'deal_master' 
      AND column_name = 'search_key'
    `);

    if (!searchKeyColumnExists || searchKeyColumnExists.count === 0) {
      console.log('🔍 Adding search_key column to deal_master table...');
      await executeQuery(`
        ALTER TABLE deal_master ADD COLUMN search_key TEXT
      `);
      console.log('✅ search_key column added to deal_master table');
    }

    // Backfill search_key for existing records
    console.log('🔄 Backfilling search_key for existing records...');
    await executeQuery(`
      UPDATE deal_master 
      SET search_key = LOWER(REPLACE(REPLACE(IFNULL(stock_description, ''), ' ', ''), '.', ''))
    `);
    console.log('✅ Backfilled search_key for existing records');

    // Add index for performance
    try {
      await executeQuery('CREATE INDEX idx_search_key ON deal_master(search_key)');
      console.log('✅ Search key index created');
    } catch (indexError) {
      // Index might already exist, that's OK
      console.log('ℹ️ Search key index may already exist');
    }

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}