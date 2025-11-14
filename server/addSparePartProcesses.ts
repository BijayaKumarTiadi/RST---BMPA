import { executeQuery } from './database';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  try {
    console.log('Running spare part processes migration...\n');

    // Read the SQL file
    const sqlFilePath = path.join(process.cwd(), 'database', 'add_new_spare_part_processes.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');

    // Remove comments and split into INSERT statements
    const lines = sqlContent.split('\n');
    const insertStatements: string[] = [];
    let currentStatement = '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip comments and empty lines
      if (trimmedLine.startsWith('--') || trimmedLine === '' || trimmedLine.toUpperCase() === 'COMMIT;') {
        continue;
      }
      
      currentStatement += line + '\n';
      
      // If line ends with semicolon, we have a complete statement
      if (trimmedLine.endsWith(';')) {
        insertStatements.push(currentStatement.trim());
        currentStatement = '';
      }
    }

    console.log(`Found ${insertStatements.length} INSERT statements to execute\n`);

    // Execute each INSERT statement
    for (let i = 0; i < insertStatements.length; i++) {
      const statement = insertStatements[i];
      if (statement && statement.toUpperCase().includes('INSERT')) {
        try {
          await executeQuery(statement);
          console.log(`✓ Executed INSERT statement ${i + 1}/${insertStatements.length}`);
        } catch (error: any) {
          // Ignore duplicate entry errors
          if (error.message.includes('Duplicate entry')) {
            console.log(`  (Skipped duplicate entry)`);
          } else {
            console.error(`✗ Error executing statement ${i + 1}:`, error.message);
            throw error;
          }
        }
      }
    }

    console.log('\n✓ Migration completed successfully!\n');
    console.log('New processes added:');
    console.log('- PRINTING');
    console.log('- COATING');
    console.log('- LAMINATION');
    console.log('- PUNCHING');
    console.log('- PASTING');
    console.log('- WINDOW PATCHING');
    console.log('- CORRUGATION');
    console.log('- STAMPING');
    console.log('- OTHERS');
    console.log('- DIGITAL');
    console.log('- SCREEN');
    console.log('\nAll spare part dropdowns are now independent!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();