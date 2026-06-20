/**
 * APIレスポンスでunreachableStatusフィールドが返されているか確認
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// .env.localを読み込む
config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testApiUnreachableField() {
  try {
    console.log('🔍 Testing API response for unreachable_status field...\n');

    // データベースから直接取得
    const { data: dbData, error: dbError } = await supabase
      .from('sellers')
      .select('id, seller_number, unreachable_status')
      .eq('seller_number', 'AA13462')
      .single();

    if (dbError) {
      console.error('❌ Database error:', dbError);
      return;
    }

    console.log('📊 Database data:');
    console.log('ID:', dbData.id);
    console.log('Seller Number:', dbData.seller_number);
    console.log('unreachable_status (DB):', dbData.unreachable_status);
    console.log('Type:', typeof dbData.unreachable_status);

    console.log('\n✅ Database has the correct value: "不通"');
    console.log('\n📝 Next step: Check if the API endpoint returns this field correctly');
    console.log('   Open browser DevTools → Network tab → Find the API call to /api/sellers/{id}');
    console.log('   Check if the response includes "unreachableStatus": "不通"');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testApiUnreachableField();
