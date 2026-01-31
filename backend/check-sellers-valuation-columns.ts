/**
 * sellersテーブルの査定関連カラムを確認
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkColumns() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { data, error } = await supabase
    .from('sellers')
    .select('*')
    .limit(1);

  if (error) {
    console.log('エラー:', error.message);
    return;
  }

  if (data && data[0]) {
    const columns = Object.keys(data[0]);
    console.log('=== 査定関連カラム ===');
    columns.filter(c => 
      c.includes('valuation') || 
      c.includes('estimate') ||
      c.includes('price') ||
      c.includes('amount')
    ).forEach(c => console.log('  -', c, ':', data[0][c]));
    
    console.log('');
    console.log('=== 全カラム一覧 ===');
    columns.forEach(c => console.log('  -', c));
  }
}

checkColumns().catch(console.error);
