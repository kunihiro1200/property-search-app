import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyMigration() {
  try {
    console.log('Verifying migration 103...');

    // Try to select business_inquiry column
    const { data, error } = await supabase
      .from('buyers')
      .select('buyer_number, name, company_name, business_inquiry')
      .limit(5);

    if (error) {
      console.error('Error:', error);
      process.exit(1);
    }

    console.log('✅ Migration verified successfully!');
    console.log('business_inquiry column exists in buyers table');
    console.log('\nSample data:');
    console.table(data);

    // Check if any buyers have company_name
    const { data: buyersWithCompanyName, error: error2 } = await supabase
      .from('buyers')
      .select('buyer_number, name, company_name, business_inquiry')
      .not('company_name', 'is', null)
      .neq('company_name', '')
      .limit(10);

    if (error2) {
      console.error('Error:', error2);
    } else {
      console.log(`\n法人名が入力されている買主: ${buyersWithCompanyName?.length || 0}件`);
      if (buyersWithCompanyName && buyersWithCompanyName.length > 0) {
        console.table(buyersWithCompanyName);
      }
    }

  } catch (error) {
    console.error('Error verifying migration:', error);
    process.exit(1);
  }
}

verifyMigration();
