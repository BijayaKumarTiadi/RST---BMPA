import { executeQuery } from './database';
import * as fs from 'fs';
import * as path from 'path';

export async function addCompanyChildUserColumns(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('📋 Starting company child user columns migration...');

    // Read the SQL file
    const sqlFilePath = path.join(__dirname, '../database/add_company_child_user_columns.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Split by semicolons and filter out comments and empty statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => {
        // Remove comments and empty lines
        const cleanStmt = stmt.replace(/--.*$/gm, '').trim();
        return cleanStmt.length > 0 && !cleanStmt.startsWith('--');
      });

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`⚙️  Executing statement ${i + 1}/${statements.length}...`);
          await executeQuery(statement);
          console.log(`✅ Statement ${i + 1} executed successfully`);
        } catch (error: any) {
          // Check if error is about duplicate column/index (already exists)
          if (error.code === 'ER_DUP_FIELDNAME' || error.code === 'ER_DUP_KEYNAME') {
            console.log(`⚠️  Statement ${i + 1} skipped (already exists): ${error.message}`);
          } else {
            console.error(`❌ Error executing statement ${i + 1}:`, error.message);
            throw error;
          }
        }
      }
    }

    console.log('✅ Company child user columns migration completed successfully!');

    return {
      success: true,
      message: 'Company child user columns added successfully'
    };

  } catch (error: any) {
    console.error('❌ Error adding company child user columns:', error);
    return {
      success: false,
      message: `Failed to add company child user columns: ${error.message}`
    };
  }
}