import { executeQuery } from './database';
import * as fs from 'fs';
import * as path from 'path';

export async function runSparePartCategoriesMigration() {
  console.log('Starting spare part categories migration...');
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'database', 'update_spare_part_categories.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split by semicolons and filter empty statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && stmt !== 'COMMIT');
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement && !statement.startsWith('--')) {
        try {
          await executeQuery(statement);
          console.log(`Executed statement ${i + 1}/${statements.length}`);
        } catch (error: any) {
          // Skip errors for ALTER TABLE if it fails (some MySQL versions don't support it)
          if (statement.includes('AUTO_INCREMENT') && error.message.includes('AUTO_INCREMENT')) {
            console.log(`Skipped AUTO_INCREMENT reset (table might be empty): ${error.message}`);
          } else {
            throw error;
          }
        }
      }
    }
    
    console.log('Spare part categories migration completed successfully!');
    return { success: true, message: 'Migration completed successfully' };
  } catch (error: any) {
    console.error('Migration failed:', error);
    return { success: false, message: error.message };
  }
}