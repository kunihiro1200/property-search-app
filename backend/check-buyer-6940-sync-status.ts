import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '.env') });

import { EnhancedAutoSyncService } from './src/services/EnhancedAutoSyncService';
import { createClient } from '@supabase/supabase-js';

console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '設定済み' : '未設定');
console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '設定済み' : '未設定');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ 環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkBuyerSyncStatus() {
  console.log('=== 買主6940の同期状態を確認 ===\n');
  
  const syncService = new EnhancedAutoSyncService(supabase);
  await syncService.initializeBuyer();
  
  // スプレッドシートから全データを取得
  const allRows = await (syncService as any).getBuyerSpreadsheetData(true); // forceRefresh = true
  console.log(`📊 スプレッドシート総行数: ${allRows.length}\n`);
  
  // 買主6940を検索
  const buyer6940 = allRows.find((row: any) => row['買主番号'] === '6940');
  
  if (!buyer6940) {
    console.log('❌ スプレッドシートに買主6940が見つかりません\n');
    
    // 類似の買主番号を検索
    const similarBuyers = allRows
      .filter((row: any) => {
        const buyerNumber = row['買主番号'];
        return buyerNumber && buyerNumber.toString().includes('6940');
      })
      .slice(0, 5);
    
    if (similarBuyers.length > 0) {
      console.log('類似の買主番号:');
      similarBuyers.forEach((buyer: any) => {
        console.log(`  - ${buyer['買主番号']} (${buyer['●氏名・会社名']})`);
      });
    }
    
    // 最後の数件を表示
    console.log('\n最後の5件の買主番号:');
    allRows.slice(-5).forEach((row: any) => {
      console.log(`  - ${row['買主番号']} (${row['●氏名・会社名']})`);
    });
    
    return;
  }
  
  console.log('✅ スプレッドシートに買主6940が存在します\n');
  console.log('=== スプレッドシートのデータ ===');
  console.log('買主番号:', buyer6940['買主番号']);
  console.log('氏名:', buyer6940['●氏名・会社名']);
  console.log('電話番号:', buyer6940['●電話番号\n（ハイフン不要）']);
  console.log('メールアドレス:', buyer6940['●メアド']);
  console.log('受付日:', buyer6940['受付日']);
  console.log('問合せ元:', buyer6940['●問合せ元']);
  
  // データベースの状態を確認
  console.log('\n=== データベースの状態 ===');
  const { data: dbBuyer } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '6940')
    .maybeSingle();
  
  if (!dbBuyer) {
    console.log('❌ データベースに買主6940が存在しません');
  } else {
    console.log('✅ データベースに買主6940が存在します');
    console.log('削除日:', dbBuyer.deleted_at);
    console.log('作成日:', dbBuyer.created_at);
    console.log('更新日:', dbBuyer.updated_at);
  }
}

checkBuyerSyncStatus().catch(console.error);
