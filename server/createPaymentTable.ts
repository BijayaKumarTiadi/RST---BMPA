import { executeQuery } from './database';

async function createPaymentHistoryTable() {
  try {
    console.log('Creating bmpa_payment_history table...');
    
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS bmpa_payment_history (
        id INT PRIMARY KEY AUTO_INCREMENT,
        member_id INT NOT NULL,
        order_id VARCHAR(255) NOT NULL,
        payment_id VARCHAR(255),
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'INR',
        status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
        payment_method VARCHAR(50) DEFAULT 'razorpay',
        signature TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (member_id) REFERENCES bmpa_members(member_id) ON DELETE RESTRICT,
        INDEX idx_member_id (member_id),
        INDEX idx_order_id (order_id),
        INDEX idx_payment_id (payment_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    
    console.log('✅ bmpa_payment_history table created successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error creating payment history table:', error.message);
    process.exit(1);
  }
}

createPaymentHistoryTable();