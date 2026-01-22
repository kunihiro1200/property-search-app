import { SpreadsheetSyncService } from './src/services/SpreadsheetSyncService';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function syncAA13231Manual() {
  console.log('=== AA13231 を手動同期 ===\n');

  const syncService = new SpreadsheetSyncService();

  try {
    // AA13231のデータを同期
    console.log('スプレッドシートからAA13231を検索中...\n');
    
    const result = await syncService.syncSellers({
      sellerNumbers: ['AA13231']
    });

    console.log('同期結果:');
    console.log(JSON.stringify(result, null, 2));

    // 同期後のデータを確認
    console.log('\n\n同期後のデータベース確認...\n');
    const { data, error } = await supabase
      .from('sellers')
      .select('seller_number, status, visit_assignee, contract_year_month, updated_at')
      .eq('seller_number', 'AA13231')
      .single();

    if (error) {
      console.error('エラー:', error);
    } else if (data) {
      console.log('売主番号:', data.seller_number);
      console.log('状況:', data.status);
      console.log('営担:', data.visit_assignee);
      console.log('契約年月:', data.contract_year_month);
      console.log('更新日時:', data.updated_at);
    }

  } catch (error) {
    console.error('同期エラー:', error);
  }
}

syncAA13231Manual().catch(console.error);
