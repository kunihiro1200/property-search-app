import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA12679() {
  console.log('=== AA12679の確認 ===\n');

  try {
    const { data, error } = await supabase
      .from('sellers')
      .select('*')
      .eq('seller_number', 'AA12679');

    if (error) {
      console.error('エラー:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('❌ AA12679はデータベースに存在しません');
      return;
    }

    console.log(`✅ AA12679が見つかりました (${data.length}件)\n`);
    
    data.forEach((row, index) => {
      console.log(`レコード ${index + 1}:`);
      console.log(`  ID: ${row.id}`);
      console.log(`  売主番号: ${row.seller_number}`);
      console.log(`  名前: ${row.name}`);
      console.log(`  契約年月: ${row.contract_year_month}`);
      console.log(`  状況: ${row.status}`);
      console.log(`  営担: ${row.visit_assignee || '(null)'}`);
      console.log(`  確度: ${row.confidence}`);
      console.log(`  作成日時: ${row.created_at}`);
      console.log(`  更新日時: ${row.updated_at}\n`);
    });

  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  }
}

checkAA12679();
