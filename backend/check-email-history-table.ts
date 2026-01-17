/**
 * Check if email_history table exists in the database
 */

import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

async function checkEmailHistoryTable() {
  console.log('🔍 Checking email_history table existence\n');
  console.log('='.repeat(60));

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  try {
    // Check if table exists using information_schema
    const { data, error } = await supabase
      .from('email_history')
      .select('id')
      .limit(1);

    if (error) {
      if (error.message.includes('does not exist') || error.message.includes('schema cache')) {
        console.log('❌ Table does NOT exist');
        console.log('\n📋 Next steps:');
        console.log('   1. Open Supabase SQL Editor:');
        console.log('      https://supabase.com/dashboard/project/fzcuexscuwhoywcicdqq/editor');
        console.log('   2. Copy the SQL from: backend/migrations/056_add_email_history.sql');
        console.log('   3. Paste and execute in SQL Editor');
        console.log('   4. Wait for success message');
        console.log('   5. Restart Supabase project (Pause → Wait → Resume → Wait 10 min)');
        console.log('   6. Run this script again\n');
        return;
      }
      throw error;
    }

    console.log('✅ Table EXISTS in database');
    console.log(`   Found ${data?.length || 0} records`);
    
    // Check table structure
    console.log('\n📊 Checking table structure...');
    
    const { data: structureData, error: structureError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'email_history'
          ORDER BY ordinal_position;
        `
      });

    if (!structureError && structureData) {
      console.log('   Columns:');
      structureData.forEach((col: any) => {
        console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ email_history table is ready to use!\n');

  } catch (error: any) {
    console.error('\n❌ Error checking table:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkEmailHistoryTable();
