// 買主6951のステータスを確認
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .envファイルを読み込み
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('環境変数が設定されていません');
  console.error('SUPABASE_URL:', supabaseUrl ? '設定済み' : '未設定');
  console.error('SUPABASE_SERVICE_KEY:', supabaseKey ? '設定済み' : '未設定');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBuyer6951() {
  console.log('買主6951のデータを確認中...\n');

  // 買主6951を取得
  const { data: buyer, error } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '6951')
    .single();

  if (error) {
    console.error('エラー:', error);
    return;
  }

  if (!buyer) {
    console.log('買主6951が見つかりません');
    return;
  }

  console.log('=== 買主6951の基本情報 ===');
  console.log('買主番号:', buyer.buyer_number);
  console.log('氏名:', buyer.name);
  console.log('物件番号:', buyer.property_number);
  console.log('');

  console.log('=== サイドバーステータス関連フィールド ===');
  console.log('broker_survey（業者向けアンケート）:', buyer.broker_survey);
  console.log('latest_status（最新状況）:', buyer.latest_status);
  console.log('inquiry_confidence（確度）:', buyer.inquiry_confidence);
  console.log('viewing_result_follow_up（内覧結果・後続対応）:', buyer.viewing_result_follow_up);
  console.log('');

  // BuyerStatusCalculatorのPriority 3条件をチェック
  console.log('=== Priority 3条件チェック（業者問合せあり） ===');
  console.log('条件: broker_survey === "未"');
  console.log('結果:', buyer.broker_survey === '未' ? '✅ 一致（業者問合せあり）' : '❌ 不一致');
  console.log('');

  // 物件情報を確認
  if (buyer.property_number) {
    console.log('=== 紐づいた物件情報 ===');
    const propertyNumbers = buyer.property_number.split(',').map((n: string) => n.trim());
    
    for (const propertyNumber of propertyNumbers) {
      const { data: property, error: propError } = await supabase
        .from('property_listings')
        .select('property_number, address, display_address, property_type')
        .eq('property_number', propertyNumber)
        .single();

      if (propError) {
        console.log(`物件 ${propertyNumber}: エラー - ${propError.message}`);
      } else if (property) {
        console.log(`物件 ${propertyNumber}:`);
        console.log('  住所:', property.display_address || property.address);
        console.log('  種別:', property.property_type);
      } else {
        console.log(`物件 ${propertyNumber}: 見つかりません`);
      }
    }
  }
}

checkBuyer6951()
  .then(() => {
    console.log('\n確認完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('エラー:', error);
    process.exit(1);
  });
