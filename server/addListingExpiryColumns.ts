import { executeQuery, executeQuerySingle } from './database';

async function addListingExpiryColumns() {
  try {
    console.log('🔄 Adding listing expiry columns to deal_master table...');
    
    // Check and add last_active_date column
    const lastActiveExists = await executeQuerySingle(`
      SELECT COUNT(*) as count FROM information_schema.columns
      WHERE table_schema = 'trade_bmpa25' AND table_name = 'deal_master' AND column_name = 'last_active_date'
    `);
    
    if (!lastActiveExists || lastActiveExists.count === 0) {
      await executeQuery(`
        ALTER TABLE deal_master
        ADD COLUMN last_active_date DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Last time listing was active or reactivated'
      `);
      console.log('✅ Added last_active_date column');
    } else {
      console.log('ℹ️ last_active_date column already exists');
    }
    
    // Check and add reactivation_count column
    const reactivationCountExists = await executeQuerySingle(`
      SELECT COUNT(*) as count FROM information_schema.columns
      WHERE table_schema = 'trade_bmpa25' AND table_name = 'deal_master' AND column_name = 'reactivation_count'
    `);
    
    if (!reactivationCountExists || reactivationCountExists.count === 0) {
      await executeQuery(`
        ALTER TABLE deal_master
        ADD COLUMN reactivation_count INT DEFAULT 0 COMMENT 'Number of times listing has been reactivated (max 2)'
      `);
      console.log('✅ Added reactivation_count column');
    } else {
      console.log('ℹ️ reactivation_count column already exists');
    }
    
    // Check and add expiry_date column
    const expiryDateExists = await executeQuerySingle(`
      SELECT COUNT(*) as count FROM information_schema.columns
      WHERE table_schema = 'trade_bmpa25' AND table_name = 'deal_master' AND column_name = 'expiry_date'
    `);
    
    if (!expiryDateExists || expiryDateExists.count === 0) {
      await executeQuery(`
        ALTER TABLE deal_master
        ADD COLUMN expiry_date DATETIME NULL COMMENT 'Date when listing will be auto-deleted if inactive'
      `);
      console.log('✅ Added expiry_date column');
    } else {
      console.log('ℹ️ expiry_date column already exists');
    }
    
    // Check and add auto_deleted column
    const autoDeletedExists = await executeQuerySingle(`
      SELECT COUNT(*) as count FROM information_schema.columns
      WHERE table_schema = 'trade_bmpa25' AND table_name = 'deal_master' AND column_name = 'auto_deleted'
    `);
    
    if (!autoDeletedExists || autoDeletedExists.count === 0) {
      await executeQuery(`
        ALTER TABLE deal_master
        ADD COLUMN auto_deleted TINYINT(1) DEFAULT 0 COMMENT 'Flag to mark auto-deleted listings'
      `);
      console.log('✅ Added auto_deleted column');
    } else {
      console.log('ℹ️ auto_deleted column already exists');
    }
    
    // Create index for efficient auto-deletion queries
    try {
      await executeQuery(`
        CREATE INDEX idx_expiry_date ON deal_master(expiry_date, StockStatus)
      `);
      console.log('✅ Created index on expiry_date');
    } catch (error: any) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️ Index idx_expiry_date already exists');
      } else {
        throw error;
      }
    }
    
    // Update existing active listings with expiry dates
    const updateResult = await executeQuery(`
      UPDATE deal_master
      SET last_active_date = COALESCE(deal_created_at, CURRENT_TIMESTAMP),
          expiry_date = DATE_ADD(COALESCE(deal_created_at, CURRENT_TIMESTAMP), INTERVAL 90 DAY)
      WHERE StockStatus = 1 AND expiry_date IS NULL
    `);
    console.log(`✅ Updated ${(updateResult as any).affectedRows || 0} existing listings with expiry dates`);
    
    // Verify the changes
    const result = await executeQuery(`
      SELECT 
        COUNT(*) as total_listings,
        SUM(CASE WHEN StockStatus = 1 THEN 1 ELSE 0 END) as active_listings,
        SUM(CASE WHEN expiry_date IS NOT NULL THEN 1 ELSE 0 END) as listings_with_expiry
      FROM deal_master
    `);
    
    if (result && result.length > 0) {
      console.log('📋 Verification:');
      console.log(result[0]);
    }
    
    console.log('✅ Listing expiry columns added successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error adding listing expiry columns:', error);
    process.exit(1);
  }
}

addListingExpiryColumns();