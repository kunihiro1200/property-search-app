import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function listSellersColumns() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('📋 Listing all columns in sellers table...\n');

  // Get one row to see all columns
  const { data, error } = await supabase
    .from('sellers')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (data && data.length > 0) {
    const columns = Object.keys(data[0]).sort();
    console.log(`✅ Found ${columns.length} columns:\n`);
    
    columns.forEach((col, index) => {
      console.log(`${(index + 1).toString().padStart(3, ' ')}. ${col}`);
    });
    
    // Check for inquiry-related columns
    console.log('\n🔍 Inquiry-related columns:');
    const inquiryColumns = columns.filter(col => col.includes('inquiry'));
    if (inquiryColumns.length > 0) {
      inquiryColumns.forEach(col => console.log(`   - ${col}`));
    } else {
      console.log('   (none found)');
    }
  } else {
    console.log('⚠️  No data found in sellers table');
  }
}

listSellersColumns().catch(console.error);
