import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function createSyncTables() {
  console.log('=== Creating Sync Tables Directly ===\n');

  try {
    // Read migration 026
    console.log('1. Reading migration 026...');
    const migration026Path = path.join(__dirname, 'migrations', '026_add_sync_logs.sql');
    const migration026SQL = fs.readFileSync(migration026Path, 'utf-8');
    
    console.log('2. Executing migration 026...');
    const { error: error026 } = await supabase.rpc('exec_sql', { sql: migration026SQL });
    
    if (error026) {
      console.error('❌ Error executing migration 026:', error026);
    } else {
      console.log('✅ Migration 026 executed successfully');
    }

    // Read migration 039
    console.log('\n3. Reading migration 039...');
    const migration039Path = path.join(__dirname, 'migrations', '039_add_sync_health.sql');
    const migration039SQL = fs.readFileSync(migration039Path, 'utf-8');
    
    console.log('4. Executing migration 039...');
    const { error: error039 } = await supabase.rpc('exec_sql', { sql: migration039SQL });
    
    if (error039) {
      console.error('❌ Error executing migration 039:', error039);
    } else {
      console.log('✅ Migration 039 executed successfully');
    }

    // Notify PostgREST to reload schema
    console.log('\n5. Notifying PostgREST to reload schema...');
    const { error: reloadError } = await supabase.rpc('pgrst_reload_schema');
    
    if (reloadError) {
      console.log('⚠️  Could not reload schema via RPC (this is normal if function does not exist)');
      console.log('   You may need to restart your Supabase project or wait a few minutes');
    } else {
      console.log('✅ Schema reload notification sent');
    }

    console.log('\n=== Summary ===');
    console.log('Tables should now be created. Wait 1-2 minutes for PostgREST to recognize them.');
    console.log('Then run: npx ts-node check-sync-tables-direct.ts');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createSyncTables().catch(console.error);
