import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatusValues() {
  console.log('=== データベースのステータス値を確認 ===\n');
  
  // ユニークなステータス値を取得
  const { data: sellers, error } = await supabase
    .from('sellers')
    .select('status')
    .not('status', 'is', null);
  
  if (error) {
    console.error('❌ エラー:', error);
    return;
  }
  
  // ユニークな値を抽出
  const uniqueStatuses = [...new Set(sellers?.map(s => s.status))];
  
  console.log(`📊 ユニークなステータス値: ${uniqueStatuses.length}件\n`);
  
  uniqueStatuses.sort().forEach((status, index) => {
    const count = sellers?.filter(s => s.status === status).length || 0;
    console.log(`${index + 1}. "${status}" - ${count}件`);
  });
}

checkStatusValues()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
