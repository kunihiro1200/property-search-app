import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findBuyer6648() {
  console.log('============================================================');
  console.log('買主6648の検索（正しいカラムで）');
  console.log('============================================================\n');

  try {
    // buyer_numberで検索
    console.log('📡 buyer_number = 6648 で検索中...');
    const { data: byNumber, error: numberError } = await supabase
      .from('buyers')
      .select('*')
      .eq('buyer_number', '6648');

    if (numberError) {
      console.log('❌ エラー:', numberError.message);
    } else if (byNumber && byNumber.length > 0) {
      console.log(`✅ 見つかりました！ (${byNumber.length}件)`);
      byNumber.forEach((buyer, index) => {
        console.log(`\n--- 買主 ${index + 1} ---`);
        console.log(`  UUID: ${buyer.id}`);
        console.log(`  buyer_number: ${buyer.buyer_number}`);
        console.log(`  buyer_id: ${buyer.buyer_id || 'なし'}`);
        console.log(`  名前: ${buyer.name || 'なし'}`);
        console.log(`  メール: ${buyer.email || 'なし'}`);
        console.log(`  synced_at: ${buyer.synced_at || 'NULL'}`);
        console.log(`  db_updated_at: ${buyer.db_updated_at || 'NULL'}`);
      });
    } else {
      console.log('⚠️ buyer_number = 6648 のデータが見つかりません');
    }

    // buyer_idでも検索
    console.log('\n\n📡 buyer_id = 6648 で検索中...');
    const { data: byId, error: idError } = await supabase
      .from('buyers')
      .select('*')
      .eq('buyer_id', 6648);

    if (idError) {
      console.log('❌ エラー:', idError.message);
    } else if (byId && byId.length > 0) {
      console.log(`✅ 見つかりました！ (${byId.length}件)`);
      byId.forEach((buyer, index) => {
        console.log(`\n--- 買主 ${index + 1} ---`);
        console.log(`  UUID: ${buyer.id}`);
        console.log(`  buyer_number: ${buyer.buyer_number}`);
        console.log(`  buyer_id: ${buyer.buyer_id || 'なし'}`);
        console.log(`  名前: ${buyer.name || 'なし'}`);
        console.log(`  メール: ${buyer.email || 'なし'}`);
        console.log(`  synced_at: ${buyer.synced_at || 'NULL'}`);
        console.log(`  db_updated_at: ${buyer.db_updated_at || 'NULL'}`);
      });
    } else {
      console.log('⚠️ buyer_id = 6648 のデータが見つかりません');
    }

  } catch (err: any) {
    console.error('❌ 予期しないエラー:', err.message);
  }
}

findBuyer6648();
