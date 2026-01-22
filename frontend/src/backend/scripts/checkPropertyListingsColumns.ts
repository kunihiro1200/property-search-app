import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  console.log('🔍 property_listingsテーブルのカラムを確認中...\n');

  // 1件だけ取得してカラムを確認
  const { data, error } = await supabase
    .from('property_listings')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ エラー:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️ データが見つかりませんでした');
    return;
  }

  const columns = Object.keys(data[0]);
  console.log(`✅ ${columns.length}個のカラムが見つかりました:\n`);
  columns.sort().forEach((col, index) => {
    console.log(`${index + 1}. ${col}`);
  });
}

checkColumns().catch(console.error);
