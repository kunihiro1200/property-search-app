import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEnglishStatusValues() {
  console.log('=== Checking English Status Values ===\n');

  const englishValues = [
    'following_up',
    'appointment_scheduled',
    'visited',
    'exclusive_contract',
    'general_contract',
    'contracted',
    'other_decision',
    'follow_up_not_needed',
    'lost',
    'follow_up_not_needed_after_exclusion'
  ];

  for (const value of englishValues) {
    const { data: sellers, error } = await supabase
      .from('sellers')
      .select('id, seller_number, name, status')
      .eq('status', value)
      .limit(5);

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

checkEnglishStatusValues()
  .then(() => {
    console.log('✅ Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
