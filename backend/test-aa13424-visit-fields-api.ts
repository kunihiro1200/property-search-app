/**
 * AA13424の訪問フィールドがフロントエンドで正しく表示されるか確認
 * データベースとAPIレスポンスの両方をチェック
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function testAA13424VisitFieldsDisplay() {
  console.log('🔍 AA13424の訪問フィールド表示を確認中...\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. データベースから直接確認
    console.log('📊 データベースから確認:\n');
    const { data: dbSeller, error: dbError } = await supabase
      .from('sellers')
      .select('seller_number, visit_acquisition_date, visit_date, visit_valuation_acquirer, visit_assignee')
      .eq('seller_number', 'AA13424')
      .single();

    if (dbError) {
      console.error('❌ データベースエラー:', dbError.message);
      process.exit(1);
    }

    console.log('   訪問取得日:', dbSeller.visit_acquisition_date || '未設定');
    console.log('   訪問日:', dbSeller.visit_date || '未設定');
    console.log('   訪問査定取得者:', dbSeller.visit_valuation_acquirer || '未設定');
    console.log('   営担:', dbSeller.visit_assignee || '未設定');

    // 2. SellerServiceを使用してAPIと同じ形式で取得
    console.log('\n📡 SellerService経由で確認:\n');
    const { SellerService } = await import('./src/services/SellerService.supabase');
    const sellerService = new SellerService(supabase);
    
    // 売主番号からIDを取得
    const { data: sellerData, error: sellerError } = await supabase
      .from('sellers')
      .select('*')
      .eq('seller_number', 'AA13424')
      .single();

    if (sellerError || !sellerData) {
      console.error('❌ 売主データ取得エラー:', sellerError?.message);
      process.exit(1);
    }

    // decryptSellerを使用して復号化
    const apiSeller = await sellerService['decryptSeller'](sellerData);
    
    if (!apiSeller) {
      console.error('❌ 売主が見つかりません');
      process.exit(1);
    }

    console.log('   訪問取得日:', apiSeller.visitAcquisitionDate || '未設定');
    console.log('   訪問日:', apiSeller.visitDate || '未設定');
    console.log('   訪問査定取得者:', apiSeller.visitValuationAcquirer || '未設定');
    console.log('   営担:', apiSeller.visitAssignee || '未設定');

    // 3. 期待値との比較
    console.log('\n🎯 期待値との比較:\n');
    const expectations = {
      visitAcquisitionDate: '2026-01-17',
      visitDate: '2026-01-18',
      visitValuationAcquirer: 'R',
      visitAssignee: 'I',
    };

    let allMatch = true;
    for (const [field, expected] of Object.entries(expectations)) {
      const actual = apiSeller[field as keyof typeof apiSeller];
      const match = actual === expected;
      allMatch = allMatch && match;
      console.log(`   ${field}: ${match ? '✅' : '❌'} (期待: ${expected}, 実際: ${actual || '未設定'})`);
    }

    if (allMatch) {
      console.log('\n🎉 すべての訪問フィールドが正しく取得されています！');
      console.log('\n📋 フロントエンドでの確認手順:');
      console.log('   1. ブラウザで http://localhost:5173 を開く');
      console.log('   2. ログイン後、売主一覧から「AA13424」を検索');
      console.log('   3. 売主詳細ページを開く');
      console.log('   4. 「訪問情報」セクションで以下が表示されることを確認:');
      console.log('      - 訪問取得日: 2026年1月17日');
      console.log('      - 訪問日: 2026年1月18日');
      console.log('      - 訪問査定取得者: R');
      console.log('      - 営担: I');
    } else {
      console.log('\n⚠️  一部のフィールドが期待値と一致しません');
    }

  } catch (error: any) {
    console.error('\n❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
    process.exit(1);
  }
}

testAA13424VisitFieldsDisplay()
  .then(() => {
    console.log('\n✅ テスト完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ エラー:', error.message);
    process.exit(1);
  });
