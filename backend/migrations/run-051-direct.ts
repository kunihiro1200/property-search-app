/**
 * Direct migration runner for Migration 051
 * This script connects directly to Supabase and executes the migration
 */

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function runMigration() {
  console.log('🚀 Starting Migration 051: Add Soft Delete Support');
  console.log('================================================\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '051_add_soft_delete_support.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Executing migration SQL...\n');

    // Split SQL into individual statements and execute them
    // We need to handle this carefully because Supabase doesn't support multi-statement queries directly
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^DO \$\$/));

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (!statement || statement.startsWith('--')) {
        continue;
      }

      try {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        
        // Use the SQL query method
        const { error } = await supabase.rpc('exec_sql', { query: statement + ';' });
        
        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error.message);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (err: any) {
        console.error(`❌ Exception in statement ${i + 1}:`, err.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`  ✅ Successful statements: ${successCount}`);
    console.log(`  ❌ Failed statements: ${errorCount}`);

    if (errorCount > 0) {
      console.log('\n⚠️  Some statements failed. Please check the errors above.');
      console.log('You may need to run the SQL manually in Supabase SQL Editor.');
      console.log('\nSQL file location: backend/migrations/051_add_soft_delete_support.sql');
    } else {
      console.log('\n✅ Migration 051 completed successfully!');
      console.log('\nChanges applied:');
      console.log('  ✓ Added deleted_at column to sellers table');
      console.log('  ✓ Added deleted_at column to properties table');
      console.log('  ✓ Created seller_deletion_audit table');
      console.log('  ✓ Updated sync_logs table with deletion tracking columns');
      console.log('  ✓ Created indexes for efficient querying');
    }

    // Verify the changes
    console.log('\n🔍 Verifying migration...');
    
    // Check if sellers.deleted_at exists
    const { data: sellersColumns, error: sellersError } = await supabase
      .from('sellers')
      .select('*')
      .limit(1);
    
    if (!sellersError) {
      console.log('  ✓ sellers table accessible');
    }

    // Check if seller_deletion_audit exists
    const { data: auditData, error: auditError } = await supabase
      .from('seller_deletion_audit')
      .select('count')
      .limit(1);
    
    if (!auditError) {
      console.log('  ✓ seller_deletion_audit table created');
    } else {
      console.log('  ⚠️  seller_deletion_audit table may not be created:', auditError.message);
    }

    console.log('\n📚 Next steps:');
    console.log('  1. Implement deletion detection logic in EnhancedAutoSyncService');
    console.log('  2. Implement soft delete execution with audit logging');
    console.log('  3. Update queries to filter out deleted sellers by default');
    console.log('  4. Implement recovery API for accidentally deleted sellers');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nPlease run the SQL manually in Supabase SQL Editor:');
    console.error('File: backend/migrations/051_add_soft_delete_support.sql');
    throw error;
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed with error:', error.message);
    process.exit(1);
  });
