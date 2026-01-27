import { EnhancedAutoSyncService } from './src/services/EnhancedAutoSyncService';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.localファイルのパスを解決
const envPath = path.resolve(__dirname, '.env.local');
dotenv.config({ path: envPath });

async function testSyncAA13479() {
  console.log('=== AA13479 手動同期テスト ===\n');

  // 環境変数を確認
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ 環境変数が設定されていません');
    console.error('SUPABASE_URL:', process.env.SUPABASE_URL ? '設定済み' : '未設定');
    console.error('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '設定済み' : '未設定');
    process.exit(1);
  }

  try {
    const syncService = new EnhancedAutoSyncService(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    console.log('🔄 AA13479を手動同期中...\n');
    
    // AA13479のみを同期
    await syncService.syncUpdatedSellers(['AA13479']);
    
    console.log('\n✅ 同期完了\n');
    
    // 同期後のデータを確認
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    const { data: seller, error } = await supabase
      .from('sellers')
      .select('seller_number, valuation_amount_1, valuation_amount_2, valuation_amount_3')
      .eq('seller_number', 'AA13479')
      .single();
    
    if (error) {
      console.error('❌ データベースエラー:', error);
      return;
    }
    
    console.log('📊 同期後のデータベースの査定額:');
    console.log('  査定額1:', seller.valuation_amount_1 ? `${(seller.valuation_amount_1 / 10000).toFixed(0)}万円` : 'null');
    console.log('  査定額2:', seller.valuation_amount_2 ? `${(seller.valuation_amount_2 / 10000).toFixed(0)}万円` : 'null');
    console.log('  査定額3:', seller.valuation_amount_3 ? `${(seller.valuation_amount_3 / 10000).toFixed(0)}万円` : 'null');
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

testSyncAA13479();
