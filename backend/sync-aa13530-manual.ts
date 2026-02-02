import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// .env.localファイルを読み込む
dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncAA13530Manual() {
  console.log('=== AA13530を手動同期 ===\n');

  try {
    // EnhancedAutoSyncServiceを使用して同期
    const { EnhancedAutoSyncService } = await import('./src/services/EnhancedAutoSyncService');
    const syncService = new EnhancedAutoSyncService();
    
    console.log('🔄 AA13530を同期中...');
    
    // 特定の売主を同期
    await syncService.syncSingleSeller('AA13530');
    
    console.log('✅ 同期完了');
    console.log('');
    
    // 同期後のデータを確認
    const { data: seller, error } = await supabase
      .from('sellers')
      .select('seller_number, comments, updated_at')
      .eq('seller_number', 'AA13530')
      .single();
    
    if (error) {
      console.error('❌ エラー:', error);
      return;
    }
    
    console.log('📊 同期後のデータベース状態:');
    console.log('売主番号:', seller.seller_number);
    console.log('コメント:', seller.comments || '(空)');
    console.log('コメントの長さ:', seller.comments ? seller.comments.length : 0);
    console.log('更新日時:', seller.updated_at);
    
  } catch (error) {
    console.error('❌ 同期エラー:', error);
  }
}

syncAA13530Manual().catch(console.error);
