import { executeQuery } from './database';
import * as fs from 'fs';
import * as path from 'path';

export async function createSparePartTables() {
  try {
    console.log('🔧 Creating spare part tables...');
    
    // Read SQL files
    const categoriesSQL = fs.readFileSync(
      path.join(__dirname, '../database/create_spare_part_categories_table.sql'),
      'utf8'
    );
    
    const listingsSQL = fs.readFileSync(
      path.join(__dirname, '../database/create_spare_part_listings_table.sql'),
      'utf8'
    );
    
    // Split by semicolons and execute each statement
    const categoriesStatements = categoriesSQL.split(';').filter(s => s.trim());
    const listingsStatements = listingsSQL.split(';').filter(s => s.trim());
    
    // Execute categories table creation
    for (const statement of categoriesStatements) {
      if (statement.trim()) {
        await executeQuery(statement);
      }
    }
    console.log('✅ spare_part_categories table created');
    
    // Execute listings table creation
    for (const statement of listingsStatements) {
      if (statement.trim()) {
        await executeQuery(statement);
      }
    }
    console.log('✅ spare_part_listings table created');
    
    return { success: true, message: 'Spare part tables created successfully' };
  } catch (error: any) {
    console.error('❌ Error creating spare part tables:', error);
    throw error;
  }
}