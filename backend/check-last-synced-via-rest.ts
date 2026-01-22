import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLastSyncedColumn() {
  console.log('============================================================');
  console.log('Supabase REST API経由でカラム確認');
  console.log('============================================================\n');

  try {
    // 1. buyersテーブルから1件取得してカラムを確認
    console.log('📡 buyersテーブルから1件取得中...');
    const { data, error } = await supabase
      .from('buyers')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ エラー:', error.message);
      return;
    }

    if (!data || data.length === 0) {
      console.log('⚠️ buyersテーブルにデータがありません');
      return;
    }

    console.log('\n✅ データ取得成功！');
    console.log('\n📋 利用可能なカラム:');
    const columns = Object.keys(data[0]);
    columns.forEach(col => {
      console.log(`  - ${col}`);
    });

    // 2. last_synced_atカラムの存在確認
    if (columns.includes('last_synced_at')) {
      console.log('\n✅ FOUND: last_synced_at カラムが存在します！');
      console.log(`   値: ${data[0].last_synced_at || 'NULL'}`);
    } else {
      console.log('\n❌ MISSING: last_synced_at カラムが見つかりません');
      console.log('\n💡 これはPostgRESTのキャッシュ問題です。');
      console.log('   実際のデータベースにはカラムが存在する可能性があります。');
    }

    // 3. 買主6648を検索
    console.log('\n\n============================================================');
    console.log('買主6648の検索');
    console.log('============================================================\n');

    const { data: buyer6648, error: searchError } = await supabase
      .from('buyers')
      .select('*')
      .eq('id', 6648)
      .single();

    if (searchError) {
      console.log('❌ 買主6648が見つかりません:', searchError.message);
    } else if (buyer6648) {
      console.log('✅ 買主6648が見つかりました！');
      console.log(`   メール: ${buyer6648.email || 'なし'}`);
      console.log(`   名前: ${buyer6648.name || 'なし'}`);
      if ('last_synced_at' in buyer6648) {
        console.log(`   last_synced_at: ${buyer6648.last_synced_at || 'NULL'}`);
      }
    }

  } catch (err: any) {
    console.error('❌ 予期しないエラー:', err.message);
  }
}

checkLastSyncedColumn();
