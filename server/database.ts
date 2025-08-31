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
      WHERE table_schema = 'spmis2425ppm' 
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
          created_at datetime DEFAULT CURRENT_TIMESTAMP,
          bmpa_approval_id int(10) DEFAULT '0',
          approval_datetime datetime DEFAULT CURRENT_TIMESTAMP,
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

      console.log('✅ Database tables created successfully');
    } else {
      console.log('✅ Database tables already exist');
    }

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}