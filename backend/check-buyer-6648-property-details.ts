import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkBuyer6648() {
  console.log('=== 買主6648の物件詳細フィールドを確認 ===\n');
  
  try {
    const { data, error } = await supabase
      .from('buyers')
      .select('buyer_number, name, building_name_price, property_address, display_address, price')
      .eq('buyer_number', 6648)
      .single();

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log('買主情報:');
    console.log('  買主番号:', data.buyer_number);
    console.log('  氏名:', data.name);
    console.log('\n物件詳細フィールド:');
    console.log('  建物名/価格:', data.building_name_price || '(空)');
    console.log('  物件所在地:', data.property_address || '(空)');
    console.log('  住居表示:', data.display_address || '(空)');
    console.log('  価格:', data.price || '(空)');
    
    // Check if any field has a value
    const hasPropertyDetails = 
      data.building_name_price || 
      data.property_address || 
      data.display_address || 
      data.price;
    
    console.log('\n結果:', hasPropertyDetails ? '✅ 物件詳細情報あり' : '❌ 物件詳細情報なし');
    
    if (!hasPropertyDetails) {
      console.log('\n💡 物件詳細セクションが表示されない理由:');
      console.log('   すべての物件詳細フィールドが空のため、');
      console.log('   BuyerDetailPage.tsxのロジックにより非表示になっています。');
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkBuyer6648();
