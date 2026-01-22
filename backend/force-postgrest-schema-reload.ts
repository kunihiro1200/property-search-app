/**
 * Force PostgREST Schema Cache Reload
 * 
 * This script forces PostgREST to reload its schema cache by sending
 * a NOTIFY command to PostgreSQL, which PostgREST listens to.
 */

import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

async function forceSchemaReload() {
  console.log('🔄 Forcing PostgREST Schema Cache Reload\n');
  console.log('='.repeat(60));

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  try {
    // Method 1: Send NOTIFY command to reload schema cache
    console.log('\n📡 Method 1: Sending NOTIFY pgrst to PostgreSQL...');
    console.log('-'.repeat(60));
    
    const { error: notifyError } = await supabase.rpc('notify_pgrst_reload');
    
    if (notifyError) {
      console.log('⚠️  NOTIFY command failed (this is expected if function doesn\'t exist)');
      console.log('   Creating the function...\n');
      
      // Create the function if it doesn't exist
      const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION notify_pgrst_reload()
        RETURNS void AS $$
        BEGIN
          NOTIFY pgrst, 'reload schema';
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `;
      
      // We can't execute raw SQL through Supabase client, so we'll use a different approach
      console.log('   Please run this SQL in Supabase SQL Editor:');
      console.log('   ' + '='.repeat(56));
      console.log(createFunctionSQL);
      console.log('   ' + '='.repeat(56));
    } else {
      console.log('✅ NOTIFY command sent successfully');
    }

    // Method 2: Verify table exists
    console.log('\n🔍 Method 2: Verifying table exists in PostgreSQL...');
    console.log('-'.repeat(60));
    
    const { data: tableExists, error: tableError } = await supabase
      .rpc('check_table_exists', { 
        table_schema: 'public', 
        table_name: 'email_history' 
      });

    if (tableError) {
      console.log('⚠️  Table check function doesn\'t exist');
      console.log('   Creating the function...\n');
      
      const checkTableSQL = `
        CREATE OR REPLACE FUNCTION check_table_exists(table_schema text, table_name text)
        RETURNS boolean AS $$
        BEGIN
          RETURN EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = $1 AND table_name = $2
          );
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `;
      
      console.log('   Please run this SQL in Supabase SQL Editor:');
      console.log('   ' + '='.repeat(56));
      console.log(checkTableSQL);
      console.log('   ' + '='.repeat(56));
    } else {
      console.log(`✅ Table exists in PostgreSQL: ${tableExists}`);
    }

    // Method 3: Try to access the table directly
    console.log('\n🔍 Method 3: Attempting direct table access...');
    console.log('-'.repeat(60));
    
    const { data, error } = await supabase
      .from('email_history')
      .select('id')
      .limit(1);

    if (error) {
      console.log('❌ Direct table access failed:');
      console.log(`   Error: ${error.message}`);
      console.log(`   Code: ${error.code}`);
      console.log(`   Details: ${error.details}`);
      
      console.log('\n📋 SOLUTION:');
      console.log('   1. Go to Supabase Dashboard → Settings → General');
      console.log('   2. Click "Pause project"');
      console.log('   3. Wait for project to pause completely');
      console.log('   4. Click "Resume project"');
      console.log('   5. Wait 2-3 minutes for services to fully restart');
      console.log('   6. Run this test again');
    } else {
      console.log('✅ Direct table access successful!');
      console.log(`   Found ${data?.length || 0} records`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Schema reload attempt completed\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the reload
forceSchemaReload();
