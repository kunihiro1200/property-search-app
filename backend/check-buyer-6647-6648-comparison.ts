import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function compareBuyers() {
  console.log('=== 買主6647と6648の比較調査 ===\n');

  // 両方の買主データを取得（buyer_numberで検索）
  const { data: buyers, error } = await supabase
    .from('buyers')
    .select('*')
    .in('buyer_number', ['6647', '6648'])
    .order('buyer_number');

  if (error) {
    console.error('エラー:', error);
    return;
  }

  if (!buyers || buyers.length === 0) {
    console.log('買主が見つかりません');
    return;
  }

  console.log(`見つかった買主数: ${buyers.length}\n`);

  buyers.forEach(buyer => {
    console.log(`\n--- 買主 ${buyer.buyer_number} (ID: ${buyer.id}) ---`);
    console.log('名前:', buyer.name);
    console.log('メールアドレス:', buyer.email);
    console.log('電話番号:', buyer.phone);
    console.log('配信タイプ:', buyer.distribution_type);
    console.log('配信エリア:', buyer.distribution_areas);
    console.log('問い合わせ元:', buyer.inquiry_source);
    console.log('希望物件種別:', buyer.desired_property_type);
    console.log('最終同期日時:', buyer.last_synced_at);
    console.log('作成日時:', buyer.created_at);
    console.log('更新日時:', buyer.updated_at);
    console.log('削除フラグ:', buyer.is_deleted);
    console.log('スプレッドシート行番号:', buyer.spreadsheet_row_number);
  });

  // 違いを分析
  if (buyers.length === 2) {
    console.log('\n\n=== 差異分析 ===');
    const buyer1 = buyers[0];
    const buyer2 = buyers[1];

    const fields = [
      'name', 'email', 'phone', 'distribution_type', 'distribution_areas',
      'inquiry_source', 'desired_property_type', 'last_synced_at',
      'created_at', 'updated_at', 'is_deleted', 'spreadsheet_row_number'
    ];

    fields.forEach(field => {
      const val1 = buyer1[field];
      const val2 = buyer2[field];
      
      if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        console.log(`\n${field}:`);
        console.log(`  6647: ${JSON.stringify(val1)}`);
        console.log(`  6648: ${JSON.stringify(val2)}`);
      }
    });

    // 同期状態の確認
    console.log('\n\n=== 同期状態 ===');
    console.log('6647 最終同期:', buyer1.last_synced_at || '未同期');
    console.log('6648 最終同期:', buyer2.last_synced_at || '未同期');

    if (buyer1.last_synced_at && !buyer2.last_synced_at) {
      console.log('\n⚠️ 6647は同期済み、6648は未同期');
    } else if (!buyer1.last_synced_at && buyer2.last_synced_at) {
      console.log('\n⚠️ 6648は同期済み、6647は未同期');
    } else if (!buyer1.last_synced_at && !buyer2.last_synced_at) {
      console.log('\n⚠️ 両方とも未同期');
    } else {
      console.log('\n✓ 両方とも同期済み');
    }
  }

  // スプレッドシートの行番号を確認
  console.log('\n\n=== スプレッドシート情報 ===');
  buyers.forEach(buyer => {
    console.log(`買主 ${buyer.buyer_number}: 行番号 ${buyer.spreadsheet_row_number || '不明'}`);
  });
}

compareBuyers().catch(console.error);
