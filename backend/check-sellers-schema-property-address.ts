import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function checkSchema() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  
  // 1件取得してカラム一覧を確認
  const { data } = await supabase
    .from('sellers')
    .select('*')
    .limit(1);
  
  if (data && data.length > 0) {
    const columns = Object.keys(data[0]);
    console.log('📋 Total columns:', columns.length);
    console.log('');
    
    // property_addressを検索
    const propertyAddressColumns = columns.filter(col => 
      col.toLowerCase().includes('property') && col.toLowerCase().includes('address')
    );
    
    console.log('🔍 Columns containing "property" and "address":');
    if (propertyAddressColumns.length > 0) {
      propertyAddressColumns.forEach(col => console.log(`  ✅ ${col}`));
    } else {
      console.log('  ❌ No columns found');
    }
    
    console.log('');
    console.log('🔍 All columns:');
    columns.forEach((col, index) => {
      console.log(`  ${index + 1}. ${col}`);
    });
  }
}

checkSchema().catch(console.error);
