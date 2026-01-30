import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function check() {
  console.log('=== AA13494とAA13490のデータベース状態を確認 ===\n');
  
  // AA13494とAA13490のデータベース状態を確認
  const { data, error } = await supabase
    .from('sellers')
    .select('id, seller_number, name, deleted_at, created_at, updated_at')
    .in('seller_number', ['AA13494', 'AA13490']);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (data.length === 0) {
    console.log('AA13494とAA13490はデータベースに存在しません');
  } else {
    console.log(`${data.length}件見つかりました:\n`);
    data.forEach(seller => {
      console.log('売主番号:', seller.seller_number);
      console.log('名前:', seller.name);
      console.log('deleted_at:', seller.deleted_at || '(null - 削除されていない)');
      console.log('created_at:', seller.created_at);
      console.log('updated_at:', seller.updated_at);
      console.log('---');
    });
  }
}

check();
