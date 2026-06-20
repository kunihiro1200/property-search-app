import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// 環境変数を読み込む
dotenv.config({ path: '.env.local' });
dotenv.config();

async function checkAA13501InDB() {
  console.log('🔍 Checking AA13501 data in database...\n');
  
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  
  // AA13501を検索（seller_numberで検索）
  const { data: seller, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA13501')
    .single();
  
  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }
  
  if (!seller) {
    console.log('❌ AA13501 not found in database');
    return;
  }
  
  console.log('✅ AA13501 found in database\n');
  console.log('📋 Database data:');
  console.log('  seller_number:', seller.seller_number);
  console.log('  unreachable_status:', seller.unreachable_status);
  console.log('  is_unreachable:', seller.is_unreachable);
  console.log('  property_address:', seller.property_address);
  console.log('  comments:', seller.comments);
  console.log('  seller_name:', seller.seller_name);
  console.log('  seller_phone:', seller.seller_phone);
}

checkAA13501InDB().catch(console.error);
