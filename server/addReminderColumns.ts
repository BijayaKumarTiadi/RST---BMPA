import { executeQuery, executeQuerySingle } from './database';

async function addReminderColumns() {
  try {
    console.log('🔄 Adding reminder tracking columns to deal_master table...');
    
    // Check and add reminder_1_sent column (15 days)
    const reminder1Exists = await executeQuerySingle(`
      SELECT COUNT(*) as count FROM information_schema.columns
      WHERE table_schema = 'trade_bmpa25' AND table_name = 'deal_master' AND column_name = 'reminder_1_sent'
    `);
    
    if (!reminder1Exists || reminder1Exists.count === 0) {
      await executeQuery(`
        ALTER TABLE deal_master
        ADD COLUMN reminder_1_sent TINYINT(1) DEFAULT 0 COMMENT 'Flag for 15-day reminder sent'
      `);
      console.log('✅ Added reminder_1_sent column');
    } else {
      console.log('ℹ️ reminder_1_sent column already exists');
    }
    
    // Check and add reminder_2_sent column (30 days)
    const reminder2Exists = await executeQuerySingle(`
      SELECT COUNT(*) as count FROM information_schema.columns
      WHERE table_schema = 'trade_bmpa25' AND table_name = 'deal_master' AND column_name = 'reminder_2_sent'
    `);
    
    if (!reminder2Exists || reminder2Exists.count === 0) {
      await executeQuery(`
        ALTER TABLE deal_master
        ADD COLUMN reminder_2_sent TINYINT(1) DEFAULT 0 COMMENT 'Flag for 30-day reminder sent'
      `);
      console.log('✅ Added reminder_2_sent column');
    } else {
      console.log('ℹ️ reminder_2_sent column already exists');
    }
    
    // Check and add reminder_3_sent column (45 days)
    const reminder3Exists = await executeQuerySingle(`
      SELECT COUNT(*) as count FROM information_schema.columns
      WHERE table_schema = 'trade_bmpa25' AND table_name = 'deal_master' AND column_name = 'reminder_3_sent'
    `);
    
    if (!reminder3Exists || reminder3Exists.count === 0) {
      await executeQuery(`
        ALTER TABLE deal_master
        ADD COLUMN reminder_3_sent TINYINT(1) DEFAULT 0 COMMENT 'Flag for 45-day reminder sent (final before deactivation)'
      `);
      console.log('✅ Added reminder_3_sent column');
    } else {
      console.log('ℹ️ reminder_3_sent column already exists');
    }
    
    // Check and add last_reminder_sent_at column
    const lastReminderExists = await executeQuerySingle(`
      SELECT COUNT(*) as count FROM information_schema.columns
      WHERE table_schema = 'trade_bmpa25' AND table_name = 'deal_master' AND column_name = 'last_reminder_sent_at'
    `);
    
    if (!lastReminderExists || lastReminderExists.count === 0) {
      await executeQuery(`
        ALTER TABLE deal_master
        ADD COLUMN last_reminder_sent_at DATETIME NULL COMMENT 'Timestamp of last reminder email sent'
      `);
      console.log('✅ Added last_reminder_sent_at column');
    } else {
      console.log('ℹ️ last_reminder_sent_at column already exists');
    }
    
    // Check and add deactivated_at column for tracking when deal was auto-deactivated
    const deactivatedAtExists = await executeQuerySingle(`
      SELECT COUNT(*) as count FROM information_schema.columns
      WHERE table_schema = 'trade_bmpa25' AND table_name = 'deal_master' AND column_name = 'deactivated_at'
    `);
    
    if (!deactivatedAtExists || deactivatedAtExists.count === 0) {
      await executeQuery(`
        ALTER TABLE deal_master
        ADD COLUMN deactivated_at DATETIME NULL COMMENT 'Timestamp when deal was auto-deactivated after 45 days'
      `);
      console.log('✅ Added deactivated_at column');
    } else {
      console.log('ℹ️ deactivated_at column already exists');
    }
    
    // Create index for efficient reminder queries
    try {
      await executeQuery(`
        CREATE INDEX idx_reminder_status ON deal_master(StockStatus, reminder_1_sent, reminder_2_sent, reminder_3_sent, deal_created_at)
      `);
      console.log('✅ Created index on reminder columns');
    } catch (error: any) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️ Index idx_reminder_status already exists');
      } else {
        console.warn('⚠️ Could not create index:', error.message);
      }
    }
    
    // Verify the changes
    const result = await executeQuery(`
      SELECT 
        COUNT(*) as total_listings,
        SUM(CASE WHEN StockStatus = 1 THEN 1 ELSE 0 END) as active_listings,
        SUM(CASE WHEN reminder_1_sent = 1 THEN 1 ELSE 0 END) as reminder_1_sent_count,
        SUM(CASE WHEN reminder_2_sent = 1 THEN 1 ELSE 0 END) as reminder_2_sent_count,
        SUM(CASE WHEN reminder_3_sent = 1 THEN 1 ELSE 0 END) as reminder_3_sent_count
      FROM deal_master
    `);
    
    if (result && result.length > 0) {
      console.log('📋 Verification:');
      console.log(result[0]);
    }
    
    console.log('✅ Reminder tracking columns added successfully!');
    
  } catch (error: any) {
    console.error('❌ Error adding reminder columns:', error);
    throw error;
  }
}

// Export for use in database initialization
export { addReminderColumns };

