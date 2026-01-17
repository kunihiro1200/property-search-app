import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyTables() {
  console.log('🔍 Verifying sync monitoring tables...\n');

  const tables = ['sync_logs', 'error_logs', 'sync_health', 'migrations'];
  let allTablesAccessible = true;

  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error(`❌ ${table}: NOT accessible`);
        console.error(`   Error: ${error.message}`);
        allTablesAccessible = false;
      } else {
        console.log(`✅ ${table}: Accessible (${count || 0} records)`);
      }
    } catch (err) {
      console.error(`❌ ${table}: Exception occurred`);
      console.error(`   ${err}`);
      allTablesAccessible = false;
    }
  }

  console.log('\n' + '='.repeat(50));
  if (allTablesAccessible) {
    console.log('✅ All tables are accessible via REST API!');
  } else {
    console.log('❌ Some tables are not accessible');
  }
  console.log('='.repeat(50));
}

verifyTables();
