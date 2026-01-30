/**
 * AA13494の削除同期がブロックされている理由を診断
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function diagnoseAA13494Deletion() {
  console.log('🔍 AA13494の削除同期がブロックされている理由を診断中...\n');

  // 1. 売主の詳細情報を取得
  console.log('📊 1. 売主の詳細情報:');
  const { data: seller, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA13494')
    .single();

  if (error || !seller) {
    console.log(`   ❌ 売主が見つかりません: ${error?.message}`);
    return;
  }

  console.log(`   - ID: ${seller.id}`);
  console.log(`   - 売主番号: ${seller.seller_number}`);
  console.log(`   - ステータス: ${seller.status}`);
  console.log(`   - deleted_at: ${seller.deleted_at || '(null)'}`);
  console.log(`   - updated_at: ${seller.updated_at}`);
  console.log(`   - next_call_date: ${seller.next_call_date || '(null)'}`);
  console.log(`   - contract_year_month: ${seller.contract_year_month || '(null)'}`);

  // 2. バリデーションチェック
  console.log('\n📊 2. バリデーションチェック:');

  // 2.1 アクティブな契約をチェック
  const activeContractStatuses = ['専任契約中', '一般契約中'];
  const hasActiveContract = activeContractStatuses.includes(seller.status);
  console.log(`   - アクティブな契約: ${hasActiveContract ? '⚠️ あり (' + seller.status + ')' : '✅ なし'}`);

  // 2.2 最近のアクティビティをチェック（7日以内）
  const recentActivityDays = 7;
  const recentDate = new Date();
  recentDate.setDate(recentDate.getDate() - recentActivityDays);

  const lastActivityDate = seller.updated_at ? new Date(seller.updated_at) : null;
  const hasRecentActivity = lastActivityDate && lastActivityDate > recentDate;
  console.log(`   - 最近のアクティビティ（${recentActivityDays}日以内）: ${hasRecentActivity ? '⚠️ あり (' + seller.updated_at + ')' : '✅ なし'}`);

  // 2.3 将来の電話予定をチェック
  const nextCallDate = seller.next_call_date ? new Date(seller.next_call_date) : null;
  const hasFutureCall = nextCallDate && nextCallDate > new Date();
  console.log(`   - 将来の電話予定: ${hasFutureCall ? '⚠️ あり (' + seller.next_call_date + ')' : '✅ なし'}`);

  // 2.4 アクティブな物件リストをチェック
  const { data: propertyListings, error: listingsError } = await supabase
    .from('property_listings')
    .select('id, property_number')
    .eq('seller_id', seller.id)
    .is('deleted_at', null);

  const hasActivePropertyListings = propertyListings && propertyListings.length > 0;
  console.log(`   - アクティブな物件リスト: ${hasActivePropertyListings ? '⚠️ あり (' + propertyListings.length + '件)' : '✅ なし'}`);

  // 3. 結論
  console.log('\n📋 結論:');
  
  const blockers: string[] = [];
  if (hasActiveContract) blockers.push(`アクティブな契約（${seller.status}）`);
  if (hasRecentActivity) blockers.push(`最近のアクティビティ（${seller.updated_at}）`);
  if (hasFutureCall) blockers.push(`将来の電話予定（${seller.next_call_date}）`);
  if (hasActivePropertyListings) blockers.push(`アクティブな物件リスト（${propertyListings?.length}件）`);

  if (blockers.length > 0) {
    console.log('   ⚠️  削除がブロックされている理由:');
    blockers.forEach(b => console.log(`      - ${b}`));
    console.log('\n   💡 解決策:');
    console.log('      1. DELETION_VALIDATION_STRICT=false に設定して厳格なバリデーションを無効化');
    console.log('      2. または、手動で削除を実行');
  } else {
    console.log('   ✅ バリデーションをパスしています');
    console.log('   → 削除同期が実行されていない可能性があります');
    console.log('   → 自動同期サービスが正常に動作しているか確認してください');
  }

  // 4. 手動削除のオプション
  console.log('\n📋 手動削除のオプション:');
  console.log('   以下のコマンドで手動削除できます:');
  console.log('   npx ts-node backend/force-delete-aa13494.ts');
}

diagnoseAA13494Deletion().catch(console.error);
