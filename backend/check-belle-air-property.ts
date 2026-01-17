import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBelleAirProperty() {
  console.log('=== ベルエール大在　西日本IIA 物件確認 ===\n');

  try {
    const { data: property, error } = await supabase
      .from('property_listings')
      .select('*')
      .ilike('property_number', '%ベルエール大在%')
      .single();

    if (error) {
      console.error('❌ エラー:', error);
      return;
    }

    if (!property) {
      console.log('物件が見つかりません');
      return;
    }

    console.log('物件情報:');
    console.log('  - 物件番号:', property.property_number);
    console.log('  - ATBB状況:', property.atbb_status);
    console.log('  - ステータス:', property.status);
    console.log('  - サイト表示:', property.site_display);
    console.log('  - 格納先URL:', property.storage_location || '未設定');
    console.log('  - 作成日:', property.created_at);
    console.log('  - 更新日:', property.updated_at);

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error);
  }
}

checkBelleAirProperty();
