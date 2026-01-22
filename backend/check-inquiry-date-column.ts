import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function checkInquiryDateColumn() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('🔍 Checking sellers table columns...\n');

  // Get all columns from sellers table
  const { data, error } = await supabase
    .from('sellers')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error:', error.message);
  } else {
    console.log('✅ Query successful');
    if (data && data.length > 0) {
      console.log('\n📋 Available columns:');
      Object.keys(data[0]).sort().forEach(col => {
        console.log(`   - ${col}`);
      });
    }
  }

  // Check specifically for inquiry_date related columns
  console.log('\n🔍 Checking for inquiry_date related columns in schema...');
  
  const { data: schemaData, error: schemaError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sellers' 
      AND column_name LIKE '%inquiry%'
      ORDER BY column_name;
    `
  }).catch(() => {
    // Fallback: try direct query
    return supabase.from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'sellers')
      .like('column_name', '%inquiry%');
  });

  if (schemaError) {
    console.log('⚠️  Could not query schema directly');
  } else if (schemaData) {
    console.log('📊 Inquiry-related columns:');
    console.log(JSON.stringify(schemaData, null, 2));
  }
}

checkInquiryDateColumn().catch(console.error);
