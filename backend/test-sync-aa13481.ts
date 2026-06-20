import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.localファイルを読み込む
dotenv.config({ path: path.join(__dirname, '.env.local') });

// 環境変数を確認
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testSyncAA13481() {
  console.log('=== AA13481 同期テスト ===\n');
  
  // EnhancedAutoSyncServiceを使用して同期
  const { EnhancedAutoSyncService } = await import('./src/services/EnhancedAutoSyncService');
  
  const syncService = new EnhancedAutoSyncService(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  
  await syncService.initialize();
  
  console.log('📋 AA13481を同期中...\n');
  
  // AA13481のみを同期
  const result = await syncService.syncUpdatedSellers(['AA13481']);
  
  console.log('\n📊 同期結果:');
  console.log(JSON.stringify(result, null, 2));
  
  // データベースから再取得
  console.log('\n📊 同期後のデータベースの査定額:');
  const { data: dbData, error: dbError } = await supabase
    .from('sellers')
    .select(`
      seller_number,
      valuation_amount_1,
      valuation_amount_2,
      valuation_amount_3
    `)
    .eq('seller_number', 'AA13481')
    .single();
  
  if (dbError) {
    console.error('❌ データベースエラー:', dbError);
    return;
  }
  
  console.log(JSON.stringify(dbData, null, 2));
  
  // 結論
  if (dbData.valuation_amount_1 || dbData.valuation_amount_2 || dbData.valuation_amount_3) {
    console.log('\n✅ 査定額が正常に同期されました！');
  } else {
    console.log('\n❌ 査定額が同期されませんでした');
  }
}

testSyncAA13481().catch(console.error);
