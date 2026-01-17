// Run Migration 050: Fix remaining buyer VARCHAR(50) fields
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function runMigration() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  try {
    console.log('=== Running Migration 050: Fix Remaining Buyer VARCHAR(50) Fields ===\n');
    
    const sqlPath = path.join(__dirname, '050_fix_remaining_buyer_varchar_fields.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('This migration will convert all remaining VARCHAR(50) fields to TEXT');
    console.log('to prevent "value too long for type character varying(50)" errors.\n');
    console.log('Executing SQL...\n');
    
    // Execute the entire ALTER TABLE statement at once
    // Supabase can handle multiple column alterations in a single statement
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Migration 050 completed successfully!\n');
    console.log('All remaining VARCHAR(50) fields have been converted to TEXT.');
    console.log('This includes fields like:');
    console.log('  - name, nickname, phone_number, email');
    console.log('  - property_address, building_name_price');
    console.log('  - desired_area, desired_property_type');
    console.log('  - and 100+ other fields\n');
    console.log('Next steps:');
    console.log('1. Run buyer sync: npx ts-node sync-buyers.ts');
    console.log('2. Verify counts: npx ts-node check-buyer-count-comparison.ts');
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nIf the error persists, you can manually execute the SQL in Supabase SQL Editor:');
    console.error('File location:', path.join(__dirname, '050_fix_remaining_buyer_varchar_fields.sql'));
    process.exit(1);
  }
}

runMigration();
