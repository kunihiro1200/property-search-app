import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: {
    schema: 'public'
  }
});

async function checkTableInPostgres() {
  console.log('🔍 Checking if email_history table exists in PostgreSQL...\n');

  try {
    // Query information_schema to check if table exists
    const { data, error } = await supabase.rpc('check_table_exists', {
      table_name: 'email_history'
    });

    if (error) {
      console.log('⚠️  RPC function not available, trying direct query...\n');
      
      // Try a raw SQL query via a different method
      const query = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'email_history'
        );
      `;
      
      console.log('📝 Please run this SQL in Supabase SQL Editor to check:');
      console.log(query);
      console.log('\nIf it returns FALSE, the table doesn\'t exist yet.');
      console.log('If it returns TRUE, it\'s a schema cache issue.\n');
      
      console.log('🔧 To fix schema cache issue, run this in SQL Editor:');
      console.log('   NOTIFY pgrst, \'reload schema\';');
      console.log('\nOr create the table by running:');
      console.log('   migrations/056_add_email_history.sql\n');
      
      return;
    }

    console.log('Result:', data);

  } catch (error) {
    console.error('❌ Error:', error);
    
    console.log('\n📋 Manual steps to resolve:');
    console.log('1. Go to: https://supabase.com/dashboard/project/fzcuexscuwhoywcicdqq/sql');
    console.log('2. Run this to check if table exists:');
    console.log('   SELECT EXISTS (');
    console.log('     SELECT FROM information_schema.tables');
    console.log('     WHERE table_schema = \'public\'');
    console.log('     AND table_name = \'email_history\'');
    console.log('   );');
    console.log('\n3. If FALSE, create the table by running migrations/056_add_email_history.sql');
    console.log('4. If TRUE, reload schema cache:');
    console.log('   NOTIFY pgrst, \'reload schema\';\n');
  }
}

checkTableInPostgres();
