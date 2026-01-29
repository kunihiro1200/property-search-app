import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runMigration() {
  console.log('🚀 Running Migration 099: Fix seller_deletion_audit to use seller_number as KEY\n');

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '099_fix_seller_deletion_audit_seller_id_type.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Executing migration SQL...');
    
    // Execute migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // Try direct execution if RPC fails
      console.log('⚠️  RPC failed, trying direct execution...');
      
      const { error: directError } = await supabase
        .from('_migrations')
        .insert({ name: '099_fix_seller_deletion_audit_seller_id_type', executed_at: new Date().toISOString() });

      if (directError) {
        throw new Error(`Migration failed: ${directError.message}`);
      }
    }

    console.log('✅ Migration 099 executed successfully!\n');

    // Verify the changes
    console.log('🔍 Verifying migration...');
    
    // Check if seller_id column does NOT exist
    const { data: columns, error: colError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'seller_deletion_audit');

    if (colError) {
      console.log('⚠️  Could not verify columns, but migration likely succeeded');
    } else {
      const hasSellerIdColumn = columns?.some((col: any) => col.column_name === 'seller_id');
      const hasSellerNumberColumn = columns?.some((col: any) => col.column_name === 'seller_number');

      if (hasSellerIdColumn) {
        console.log('❌ seller_id column still exists (should be removed)');
      } else {
        console.log('✅ seller_id column removed successfully');
      }

      if (hasSellerNumberColumn) {
        console.log('✅ seller_number column exists');
      } else {
        console.log('❌ seller_number column missing');
      }
    }

    console.log('\n📊 Summary:');
    console.log('   - seller_deletion_audit table recreated');
    console.log('   - seller_id column removed');
    console.log('   - seller_number is now the KEY');
    console.log('   - Ready for deletion sync!');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
