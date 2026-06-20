import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config();

interface VerificationResult {
  sellerId: string;
  sellerNumber: string;
  missingData: string[];
}

async function verifyCallModeData() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ 環境変数が設定されていません');
    console.error('   SUPABASE_URL:', supabaseUrl ? '設定済み' : '未設定');
    console.error('   SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_KEY:', supabaseKey ? '設定済み' : '未設定');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 通話モードデータを検証中...\n');

  // 全売主を取得（最大10000件）
  const { data: sellers, error } = await supabase
    .from('sellers')
    .select('*')
    .order('seller_number', { ascending: true })
    .limit(10000);

  if (error || !sellers) {
    console.error('❌ 売主データの取得に失敗:', error);
    process.exit(1);
  }

  console.log(`✅ ${sellers.length}件の売主データを取得しました\n`);

  const results: VerificationResult[] = [];
  let propertyMissingCount = 0;
  let siteMissingCount = 0;
  let statusMissingCount = 0;

  for (const seller of sellers) {
    const missingData: string[] = [];

    // 物件情報の確認
    const { data: property } = await supabase
      .from('properties')
      .select('*')
      .eq('seller_id', seller.id)
      .single();

    if (!property) {
      missingData.push('物件情報');
      propertyMissingCount++;
    }

    // サイト情報の確認（siteフィールドを確認）
    if (!seller.site) {
      missingData.push('サイト情報');
      siteMissingCount++;
    }

    // ステータス情報の確認
    if (!seller.status) {
      missingData.push('ステータス');
      statusMissingCount++;
    }

    if (missingData.length > 0) {
      results.push({
        sellerId: seller.id,
        sellerNumber: seller.seller_number || '不明',
        missingData,
      });
    }
  }

  console.log('\n📊 検証結果:');
  console.log(`   総売主数: ${sellers.length}`);
  console.log(`   データ完全: ${sellers.length - results.length}件`);
  console.log(`   データ不足: ${results.length}件\n`);

  console.log('📈 不足データの内訳:');
  console.log(`   物件情報不足: ${propertyMissingCount}件`);
  console.log(`   サイト情報不足: ${siteMissingCount}件`);
  console.log(`   ステータス不足: ${statusMissingCount}件\n`);

  if (results.length > 0) {
    console.log('⚠️  データが不足している売主（最初の20件）:');
    results.slice(0, 20).forEach(result => {
      console.log(`   ${result.sellerNumber}: ${result.missingData.join(', ')}`);
    });

    if (results.length > 20) {
      console.log(`   ... 他${results.length - 20}件\n`);
    }
  } else {
    console.log('✅ 全ての売主データが完全です！\n');
  }
}

verifyCallModeData().catch(error => {
  console.error('❌ 検証中にエラーが発生しました:', error);
  process.exit(1);
});
