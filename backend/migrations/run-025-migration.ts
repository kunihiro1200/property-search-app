import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Starting Migration 025: Update Seller Status Constraint');

    // Read migration file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '025_update_seller_status_constraint.sql'),
      'utf8'
    );

    console.log('📝 Executing migration SQL...');

    // Execute migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // If exec_sql doesn't exist, try direct execution
      console.log('⚠️  exec_sql not available, trying direct execution...');
      
      // Split by semicolon and execute each statement
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.includes('COMMENT ON')) {
          // Skip comments as they might not work with direct execution
          console.log('⏭️  Skipping comment statement');
          continue;
        }
        
        const { error: execError } = await supabase.rpc('exec', { 
          sql: statement + ';' 
        });
        
        if (execError) {
          console.error('❌ Error executing statement:', execError);
          throw execError;
        }
      }
    }

    console.log('✅ Migration 025 completed successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log('  - Updated sellers_status_check constraint');
    console.log('  - Added missing status values:');
    console.log('    • follow_up_not_needed_after_exclusion');
    console.log('    • other_company_purchase');
    console.log('    • other_decision_follow_up');
    console.log('    • other_decision_exclusive');
    console.log('    • other_decision_general');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
