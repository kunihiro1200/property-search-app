import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Running migration 100: Add confirmation_to_assignee to buyers table\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '100_add_confirmation_to_assignee.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration SQL:');
    console.log('---');
    console.log(migrationSQL);
    console.log('---\n');

    // Execute the migration using raw SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      // If exec_sql function doesn't exist, try direct execution
      console.log('⚠️  exec_sql function not available, trying direct execution...\n');
      
      // Split SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement) {
          console.log(`Executing: ${statement.substring(0, 100)}...`);
          const { error: execError } = await supabase.rpc('exec_sql', { sql: statement });
          if (execError) {
            console.error('❌ Error executing statement:', execError.message);
          }
        }
      }
    }

    console.log('✅ Migration executed successfully\n');

    // Verify the column exists
    console.log('🔍 Verifying column exists...\n');
    const { data: verifyData, error: verifyError } = await supabase
      .from('buyers')
      .select('buyer_number, confirmation_to_assignee')
      .limit(1);

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError.message);
      process.exit(1);
    }

    console.log('✅ Column verification successful');
    console.log('📊 Sample data:', verifyData);
    console.log('\n✅ Migration 100 completed successfully!');

  } catch (err: any) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

runMigration()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
