import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkLastSyncedColumn() {
  console.log('Checking for last_synced_at column in buyers table...\n');

  const { data, error } = await supabase
    .from('buyers')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data && data.length > 0) {
    const columns = Object.keys(data[0]);
    console.log(`Total columns: ${columns.length}\n`);
    
    const hasLastSyncedAt = columns.includes('last_synced_at');
    console.log(`Has 'last_synced_at' column: ${hasLastSyncedAt}\n`);
    
    if (!hasLastSyncedAt) {
      console.log('❌ MISSING: last_synced_at column not found!');
      console.log('\nAll columns:');
      columns.sort().forEach(col => console.log(`  - ${col}`));
    } else {
      console.log('✅ FOUND: last_synced_at column exists');
      console.log(`Value: ${data[0].last_synced_at}`);
    }
  } else {
    console.log('No data in buyers table');
  }
}

checkLastSyncedColumn()
  .then(() => {
    console.log('\nDone');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
