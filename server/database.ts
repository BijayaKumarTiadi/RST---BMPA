import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

// Database configuration
const dbConfig = {
  host: process.env.MYSQL_HOST!,
  port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT) : 3306,
  user: process.env.MYSQL_USER!,
  password: process.env.MYSQL_PASSWORD!,
  database: process.env.MYSQL_DATABASE!,
  charset: 'utf8mb4',
  timezone: '+00:00',
  connectTimeout: 60000
};

// Create connection pool for better performance
export const pool = mysql.createPool(dbConfig);

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

// Helper function to execute queries with retry logic
export async function executeQuery<T = any>(
  query: string,
  params: any[] = [],
  retries: number = 3,
  connection?: any
): Promise<T[]> {
  // If a connection is provided, use it directly without retry logic (transaction context handles errors)
  if (connection) {
    try {
      const [rows] = await connection.execute(query, params);
      return rows as T[];
    } catch (error: any) {
      console.error('Database query error (transaction):', error.message || error);
      throw error;
    }
  }

  let lastError: any;

  for (let i = 0; i < retries; i++) {
    try {
      const [rows] = await pool.execute(query, params);
      return rows as T[];
    } catch (error: any) {
      lastError = error;
      console.error(`Database query error (attempt ${i + 1}/${retries}):`, error.message || error);

      // Check if it's a connection error that we should retry
      if (error.code === 'EACCES' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'PROTOCOL_CONNECTION_LOST') {

        // Wait before retrying (exponential backoff)
        if (i < retries - 1) {
          const waitTime = Math.min(1000 * Math.pow(2, i), 5000); // Max 5 seconds
          console.log(`Retrying database connection in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      } else {
        // For non-connection errors, don't retry
        throw error;
      }
    }
  }

  // If we've exhausted all retries, throw the last error
  console.error('Database query failed after all retries');
  throw lastError;
}

// Helper function for single row queries with retry logic
export async function executeQuerySingle<T = any>(
  query: string,
  params: any[] = [],
  retries: number = 3,
  connection?: any
): Promise<T | null> {
  const rows = await executeQuery<T>(query, params, retries, connection);
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
        VALUES ('admin', ?, 'System Administrator', process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com', 'super_admin')
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
          INSERT IGNORE INTO admin_users (username, password_hash, full_name, email, role)
          VALUES ('admin', ?, 'System Administrator', process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com', 'super_admin')
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
      WHERE table_schema = 'trade_bmpa25' 
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
      WHERE table_schema = 'trade_bmpa25' 
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
      WHERE table_schema = 'trade_bmpa25' 
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
    }

    // Add show_rate_in_marketplace column to deal_master if it doesn't exist
    const showRateColumnExists = await executeQuerySingle(`
      SELECT COUNT(*) as count 
      FROM information_schema.columns 
      WHERE table_schema = 'trade_bmpa25' 
      AND table_name = 'deal_master' 
      AND column_name = 'show_rate_in_marketplace'
    `);

    if (!showRateColumnExists || showRateColumnExists.count === 0) {
      console.log('🔧 Adding show_rate_in_marketplace column to deal_master...');
      await executeQuery(`
        ALTER TABLE deal_master 
        ADD COLUMN show_rate_in_marketplace TINYINT(1) DEFAULT 1
      `);
      console.log('✅ show_rate_in_marketplace column added to deal_master (default: true for existing records)');
    }

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

    // Create fsc_types table if it doesn't exist
    const fscTypesTableExists = await executeQuerySingle(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'trade_bmpa25' 
      AND table_name = 'fsc_types'
    `);

    if (!fscTypesTableExists || fscTypesTableExists.count === 0) {
      console.log('📋 Creating fsc_types table...');
      await executeQuery(`
        CREATE TABLE fsc_types (
          id INT NOT NULL PRIMARY KEY,
          name VARCHAR(50) NOT NULL,
          logo_image VARCHAR(255) DEFAULT '',
          remarks VARCHAR(255) DEFAULT ''
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      // Insert default FSC types
      await executeQuery(`
        INSERT INTO fsc_types (id, name, logo_image, remarks) VALUES 
        (0, 'None', '', ''),
        (1, 'FSC Recycle', '', ''),
        (2, 'FSC Mix', '', ''),
        (3, 'FSC Pure', '', '')
      `);
      console.log('✅ FSC Types table created with default values');
    } else {
      console.log('✅ FSC Types table already exists');
    }

    // Add fsc_type column to deal_master if it doesn't exist
    const fscTypeColumnExists = await executeQuerySingle(`
      SELECT COUNT(*) as count 
      FROM information_schema.columns 
      WHERE table_schema = 'trade_bmpa25' 
      AND table_name = 'deal_master' 
      AND column_name = 'fsc_type'
    `);

    if (!fscTypeColumnExists || fscTypeColumnExists.count === 0) {
      console.log('🔧 Adding fsc_type column to deal_master...');
      await executeQuery(`
        ALTER TABLE deal_master 
        ADD COLUMN fsc_type VARCHAR(50) DEFAULT 'None'
      `);
      console.log('✅ fsc_type column added to deal_master');
    }

    // Create rate_requests table for "Rate on Request" feature
    const rateRequestsTableExists = await executeQuerySingle(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'trade_bmpa25' 
      AND table_name = 'rate_requests'
    `);

    if (!rateRequestsTableExists || rateRequestsTableExists.count === 0) {
      console.log('📋 Creating rate_requests table...');
      await executeQuery(`
        CREATE TABLE rate_requests (
          request_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          deal_id INT NOT NULL,
          requester_id INT NOT NULL,
          seller_id INT NOT NULL,
          status ENUM('pending', 'approved', 'denied') DEFAULT 'pending',
          requester_name VARCHAR(100) DEFAULT '',
          requester_company VARCHAR(100) DEFAULT '',
          requester_email VARCHAR(100) DEFAULT '',
          seller_email VARCHAR(100) DEFAULT '',
          deal_description VARCHAR(255) DEFAULT '',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          decision_at DATETIME NULL,
          decision_notes TEXT,
          INDEX idx_deal_id (deal_id),
          INDEX idx_requester_id (requester_id),
          INDEX idx_seller_id (seller_id),
          INDEX idx_status (status),
          UNIQUE KEY unique_pending_request (deal_id, requester_id, status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('✅ Rate requests table created');
    } else {
      console.log('✅ Rate requests table already exists');
    }

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}