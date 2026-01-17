import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkBuyersSchema() {
  console.log('Checking buyers table schema...\n');

  // Get column information from information_schema
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'buyers'
      ORDER BY ordinal_position;
    `
  });

  if (error) {
    console.error('Error:', error);
    
    // Try alternative method
    console.log('\nTrying alternative query...\n');
    const { error: altError } = await supabase
      .from('buyers')
      .select('*')
      .limit(0);
    
    if (altError) {
      console.error('Alternative error:', altError);
    } else {
      console.log('Table exists but cannot query schema directly');
      console.log('Attempting to get one row to see structure...');
      
      const { data: sampleData, error: sampleError } = await supabase
        .from('buyers')
        .select('*')
        .limit(1);
      
      if (sampleError) {
        console.error('Sample error:', sampleError);
      } else if (sampleData && sampleData.length > 0) {
        console.log('\nSample row structure:');
        console.log(Object.keys(sampleData[0]));
      } else {
        console.log('No data in buyers table');
      }
    }
    return;
  }

  console.log('Buyers table columns:');
  console.log('='.repeat(80));
  
  if (data && Array.isArray(data)) {
    data.forEach((col: any) => {
      const typeInfo = col.character_maximum_length 
        ? `${col.data_type}(${col.character_maximum_length})`
        : col.data_type;
      console.log(`${col.column_name.padEnd(40)} ${typeInfo.padEnd(20)} ${col.is_nullable}`);
    });
  }
}

checkBuyersSchema()
  .then(() => {
    console.log('\nDone');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
