import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Starting Migration 023: Add exclusion_action column to sellers table\n');

    // Read SQL file
    const sqlPath = path.join(__dirname, '023_add_exclusion_action.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 Executing SQL...');
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If exec_sql doesn't exist, try direct execution
      console.log('⚠️  exec_sql not available, trying direct execution...');
      console.log('');

      // Split by semicolon and execute each statement
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        const { error: execError } = await (supabase as any).rpc('exec', { sql: statement });
        if (execError) {
          console.error('❌ Error executing statement:', execError);
          throw execError;
        }
      }
    }

    console.log('✅ Migration SQL executed successfully!\n');

    // Verify the migration
    console.log('🔍 Verifying migration...');
    const { error: verifyError } = await supabase
      .from('sellers')
      .select('exclusion_action')
      .limit(1);

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError.message);
      console.log('\n📖 The SQL may have executed but verification failed.');
      console.log('   Please run: npx ts-node migrations/verify-023-migration.ts');
      return false;
    }

    console.log('✅ exclusion_action column verified successfully!\n');

    console.log('═'.repeat(60));
    console.log('🎉 Migration 023 completed successfully!');
    console.log('═'.repeat(60));
    console.log('\n📋 Summary of changes:');
    console.log('  ✓ Added exclusion_action column to sellers table (VARCHAR(255), nullable)');
    console.log('  ✓ Added column comment for documentation');
    console.log('\n🚀 Ready to proceed with backend and frontend implementation\n');

    return true;
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n📖 Manual execution instructions:');
    console.log('   See backend/migrations/MIGRATION_023_INSTRUCTIONS.md\n');
    return false;
  }
}

runMigration().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
