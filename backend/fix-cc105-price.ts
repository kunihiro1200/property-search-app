import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function fixCC105Price() {
  console.log('🔧 Fixing CC105 price...\n');
  
  // CC105のpriceを更新（sales_priceまたはlisting_priceから計算）
  const { data, error } = await supabase
    .from('property_listings')
    .update({
      price: 21800000 // sales_price || listing_price
    })
    .eq('property_number', 'CC105')
    .select();
  
  if (error) {
    console.error('❌ Error updating CC105:', error);
    return;
  }
  
  console.log('✅ CC105 price updated:');
  console.log(JSON.stringify(data, null, 2));
}

fixCC105Price().catch(console.error);
