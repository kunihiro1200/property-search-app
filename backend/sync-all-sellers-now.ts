import { EnhancedAutoSyncService } from './src/services/EnhancedAutoSyncService';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.localファイルのパスを解決
const envPath = path.resolve(__dirname, '.env.local');
dotenv.config({ path: envPath });

async function syncAllSellers() {
  console.log('=== 全売主を同期 ===\n');

  // 環境変数を確認
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ 環境変数が設定されていません');
    process.exit(1);
  }

  try {
    const syncService = new EnhancedAutoSyncService(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    console.log('🔄 全売主を同期中...\n');
    console.log('⏱️  これには数分かかる場合があります...\n');
    
    const startTime = Date.now();
    
    // フル同期を実行（追加・更新・削除）
    await syncService.runFullSync();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ 同期完了（処理時間: ${duration}秒）\n`);
    
    // 同期後、特定の売主を確認
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    console.log('📊 同期後の確認:\n');
    
    // AA13479
    const { data: seller13479 } = await supabase
      .from('sellers')
      .select('seller_number, valuation_amount_1, valuation_amount_2, valuation_amount_3')
      .eq('seller_number', 'AA13479')
      .single();
    
    if (seller13479) {
      console.log('AA13479:');
      console.log('  査定額1:', seller13479.valuation_amount_1 ? `${(seller13479.valuation_amount_1 / 10000).toFixed(0)}万円` : 'null');
      console.log('  査定額2:', seller13479.valuation_amount_2 ? `${(seller13479.valuation_amount_2 / 10000).toFixed(0)}万円` : 'null');
      console.log('  査定額3:', seller13479.valuation_amount_3 ? `${(seller13479.valuation_amount_3 / 10000).toFixed(0)}万円` : 'null');
      console.log('');
    }
    
    // AA13483
    const { data: seller13483 } = await supabase
      .from('sellers')
      .select('seller_number, next_call_date, status, is_unreachable, phone_person, inquiry_date')
      .eq('seller_number', 'AA13483')
      .single();
    
    if (seller13483) {
      console.log('AA13483:');
      console.log('  次回架電日:', seller13483.next_call_date);
      console.log('  状況（当社）:', seller13483.status);
      console.log('  不通:', seller13483.is_unreachable);
      console.log('  架電担当者:', seller13483.phone_person || '(空)');
      console.log('  反響日付:', seller13483.inquiry_date);
      console.log('');
    }
    
    // AA13488
    const { data: seller13488 } = await supabase
      .from('sellers')
      .select('seller_number, valuation_amount_1, valuation_amount_2, valuation_amount_3')
      .eq('seller_number', 'AA13488')
      .single();
    
    if (seller13488) {
      console.log('AA13488:');
      console.log('  査定額1:', seller13488.valuation_amount_1 ? `${(seller13488.valuation_amount_1 / 10000).toFixed(0)}万円` : 'null');
      console.log('  査定額2:', seller13488.valuation_amount_2 ? `${(seller13488.valuation_amount_2 / 10000).toFixed(0)}万円` : 'null');
      console.log('  査定額3:', seller13488.valuation_amount_3 ? `${(seller13488.valuation_amount_3 / 10000).toFixed(0)}万円` : 'null');
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

syncAllSellers();
