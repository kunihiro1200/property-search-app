import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSpecificStatusValues() {
  console.log('=== Checking Specific Status Values ===\n');

  const statusValues = [
    '追客中',
    '除外済追客不要',
    '除外後追客中',
    '訪問（担当付）追客不要',
    '追客不要（未訪問）', // 全角カッコ
    '追客不要(未訪問）', // 半角左カッコ、全角右カッコ
  ];

  for (const value of statusValues) {
    const { data: sellers, error } = await supabase
      .from('sellers')
      .select('id, seller_number, name, status')
      .eq('status', value)
      .limit(3);

    if (error) {
      console.error(`❌ Error checking "${value}":`, error);
      continue;
    }

    if (sellers && sellers.length > 0) {
      console.log(`✅ Found ${sellers.length} sellers with status "${value}":`);
      sellers.forEach(s => {
        console.log(`   ${s.seller_number} - ${s.name}`);
      });
    } else {
      console.log(`⚠️ No sellers found with status "${value}"`);
    }
    console.log('');
  }
}

checkSpecificStatusValues()
  .then(() => {
    console.log('✅ Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
