import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  console.log('🔍 Diagnosing buyers table columns...\n');

  // 1. Check via information_schema
  console.log('1️⃣ Checking information_schema.columns:');
  const { data: schemaData, error: schemaError } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'buyers'
        AND column_name IN ('last_synced_at', 'sync_status', 'sync_error')
        ORDER BY column_name;
      `
    });

  if (schemaError) {
    console.log('   ⚠️  RPC not available, trying direct query...');
    
    // Try direct query
    const { data: directData, error: directError } = await supabase
      .from('buyers')
      .select('id, last_synced_at, sync_status, sync_error')
      .limit(1);
    
    if (directError) {
      console.log('   ❌ Direct query failed:', directError.message);
      console.log('   Code:', directError.code);
    } else {
      console.log('   ✅ Direct query succeeded!');
      console.log('   Sample data:', directData);
    }
  } else {
    console.log('   ✅ Schema query succeeded:');
    console.log(schemaData);
  }

  // 2. Check PostgREST schema cache age
  console.log('\n2️⃣ Checking PostgREST schema cache:');
  console.log('   Note: Cache issues are common after migrations');
  
  // 3. Try to insert a test record
  console.log('\n3️⃣ Testing write operation:');
  const testData = {
    buyer_number: 'TEST-' + Date.now(),
    name: 'Test Buyer',
    last_synced_at: new Date().toISOString(),
    sync_status: 'success'
  };
  
  const { data: insertData, error: insertError } = await supabase
    .from('buyers')
    .insert(testData)
    .select();
  
  if (insertError) {
    console.log('   ❌ Insert failed:', insertError.message);
  } else {
    console.log('   ✅ Insert succeeded!');
    
    // Clean up test data
    if (insertData && insertData[0]) {
      await supabase.from('buyers').delete().eq('id', insertData[0].id);
      console.log('   🧹 Test data cleaned up');
    }
  }

  console.log('\n📋 Diagnosis complete!');
}

diagnose().catch(console.error);
