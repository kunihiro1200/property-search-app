import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// backend/.envファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkBB16() {
  console.log('🔍 BB16物件の情報を確認中...\n');
  
  const { data, error } = await supabase
    .from('property_listings')
    .select('id, property_number, storage_location, site_display')
    .ilike('property_number', 'BB16%')
    .order('property_number');
  
  if (error) {
    console.error('❌ エラー:', error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('❌ BB16物件が見つかりません');
    return;
  }
  
  console.log(`✅ ${data.length}件のBB16物件が見つかりました:\n`);
  
  data.forEach((property: any) => {
    console.log(`物件番号: ${property.property_number}`);
    console.log(`  ID: ${property.id}`);
    console.log(`  格納先: ${property.storage_location || '未設定'}`);
    console.log(`  格納先URL: ${property.storage_url || '未設定'}`);
    console.log(`  サイト表示: ${property.site_display || '未設定'}`);
    console.log('');
  });
}

checkBB16().catch(console.error);
