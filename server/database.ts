import mysql from 'mysql2/promise';

// Database configuration
const dbConfig = {
  host: '103.155.204.186',
  port: 23306,
  user: 'manish',
  password: 'manish',
  database: 'spmis2223yrk',
  charset: 'utf8mb4',
  timezone: '+00:00',
  connectTimeout: 60000,
  acquireTimeout: 60000,
  timeout: 60000
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
      WHERE table_schema = 'spmis2223yrk' 
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
          role varchar(20) DEFAULT 'buyer',
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
        WHERE table_schema = 'spmis2223yrk' 
        AND table_name = 'bmpa_members' 
        AND column_name = 'role'
      `);

      if (!roleColumnExists || roleColumnExists.count === 0) {
        console.log('🔧 Adding role column to bmpa_members table...');
        await executeQuery(`
          ALTER TABLE bmpa_members 
          ADD COLUMN role varchar(20) DEFAULT 'buyer' 
          AFTER mstatus
        `);
        console.log('✅ Role column added successfully');
      }
      
      // Check if admin table exists, if not create it
      const adminTableExists = await executeQuerySingle(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'spmis2223yrk' 
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
      WHERE table_schema = 'spmis2223yrk' 
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

    // Check if bmpa_products table exists, if not create it
    const productsTableExists = await executeQuerySingle(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'spmis2223yrk' 
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

    // Check if bmpa_chats table exists
    const chatsTableExists = await executeQuerySingle(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'bmpa_chats'
    `);

    if (!chatsTableExists || chatsTableExists.count === 0) {
      console.log('💬 Creating bmpa_chats table...');
      await executeQuery(`
        CREATE TABLE bmpa_chats (
          id varchar(36) PRIMARY KEY,
          product_id varchar(36) NOT NULL,
          buyer_id int(10) NOT NULL,
          seller_id int(10) NOT NULL,
          status enum('active', 'closed', 'archived') DEFAULT 'active',
          created_at datetime DEFAULT CURRENT_TIMESTAMP,
          updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES bmpa_products(id) ON DELETE CASCADE,
          FOREIGN KEY (buyer_id) REFERENCES bmpa_members(member_id) ON DELETE CASCADE,
          FOREIGN KEY (seller_id) REFERENCES bmpa_members(member_id) ON DELETE CASCADE,
          INDEX idx_product_id (product_id),
          INDEX idx_buyer_id (buyer_id),
          INDEX idx_seller_id (seller_id),
          INDEX idx_updated_at (updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('✅ BMPA Chats table created successfully');
    }

    // Check if bmpa_chat_messages table exists
    const chatMessagesTableExists = await executeQuerySingle(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'bmpa_chat_messages'
    `);

    if (!chatMessagesTableExists || chatMessagesTableExists.count === 0) {
      console.log('💬 Creating bmpa_chat_messages table...');
      await executeQuery(`
        CREATE TABLE bmpa_chat_messages (
          id varchar(36) PRIMARY KEY,
          chat_id varchar(36) NOT NULL,
          sender_id int(10) NOT NULL,
          message text,
          is_read boolean DEFAULT false,
          created_at datetime DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (chat_id) REFERENCES bmpa_chats(id) ON DELETE CASCADE,
          FOREIGN KEY (sender_id) REFERENCES bmpa_members(member_id) ON DELETE CASCADE,
          INDEX idx_chat_id (chat_id),
          INDEX idx_sender_id (sender_id),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('✅ BMPA Chat messages table created successfully');
    } else {
      // Check if is_read column exists, if not add it
      const columnExists = await executeQuerySingle(`
        SELECT COUNT(*) as count 
        FROM information_schema.columns 
        WHERE table_schema = 'spmis2223yrk' 
        AND table_name = 'bmpa_chat_messages' 
        AND column_name = 'is_read'
      `);

      if (!columnExists || columnExists.count === 0) {
        console.log('📝 Adding is_read column to bmpa_chat_messages table...');
        await executeQuery(`
          ALTER TABLE bmpa_chat_messages 
          ADD COLUMN is_read boolean DEFAULT false
        `);
        console.log('✅ is_read column added successfully');
      }
    }

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}