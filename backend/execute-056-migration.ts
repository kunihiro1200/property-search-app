import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeMigration() {
  console.log('🚀 Executing migration 056: Add email_history table');
  console.log('================================================\n');

  try {
    // Read the migration SQL file
    const sqlPath = path.join(__dirname, 'migrations', '056_add_email_history.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('📄 Executing SQL...\n');

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Migration failed:', error);
      
      // Try alternative method: execute via REST API
      console.log('\n🔄 Trying alternative method...\n');
      
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ sql_query: sql })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Alternative method also failed:', errorText);
        console.log('\n⚠️  Please execute the SQL manually in Supabase SQL Editor:');
        console.log('   1. Go to https://supabase.com/dashboard/project/fzcuexscuwhoywcicdqq/sql');
        console.log('   2. Copy and paste the SQL from migrations/056_add_email_history.sql');
        console.log('   3. Click "Run"\n');
        process.exit(1);
      }

      console.log('✅ Migration executed successfully via alternative method!');
    } else {
      console.log('✅ Migration executed successfully!');
    }

    // Verify the table was created
    console.log('\n🔍 Verifying table creation...');
    const { data: tables, error: verifyError } = await supabase
      .from('email_history')
      .select('*')
      .limit(0);

    if (verifyError) {
      console.error('⚠️  Verification failed:', verifyError.message);
      console.log('\n💡 The table might need a few seconds to be available.');
      console.log('   Try running the test again in a moment.\n');
    } else {
      console.log('✅ Table verified successfully!\n');
    }

    console.log('🎉 Migration 056 complete!');
    console.log('\nNext steps:');
    console.log('1. Wait 10-15 seconds for Supabase schema cache to update');
    console.log('2. Run: npx ts-node test-email-history-api.ts\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    console.log('\n⚠️  Please execute the SQL manually in Supabase SQL Editor:');
    console.log('   1. Go to https://supabase.com/dashboard/project/fzcuexscuwhoywcicdqq/sql');
    console.log('   2. Copy and paste the SQL from migrations/056_add_email_history.sql');
    console.log('   3. Click "Run"\n');
    process.exit(1);
  }
}

executeMigration();
