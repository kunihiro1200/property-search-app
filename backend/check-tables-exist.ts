import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkTables() {
  console.log('Checking if tables exist...\n');
  
  // Check rate_limit_log
  const { error: rateLimitError } = await supabase
    .from('rate_limit_log')
    .select('*')
    .limit(1);
  
  console.log('rate_limit_log table:');
  if (rateLimitError) {
    console.log('❌ Error:', rateLimitError.message);
  } else {
    console.log('✅ Table exists');
  }
  
  // Check property_inquiries
  const { error: inquiriesError } = await supabase
    .from('property_inquiries')
    .select('*')
    .limit(1);
  
  console.log('\nproperty_inquiries table:');
  if (inquiriesError) {
    console.log('❌ Error:', inquiriesError.message);
  } else {
    console.log('✅ Table exists');
  }
}

checkTables().catch(console.error);
