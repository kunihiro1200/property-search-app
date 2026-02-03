/**
 * AA13533の当日TEL（担当）カテゴリー排他性テスト
 * 
 * 目的: 訪問予定の当日TEL(U)と訪問済みの当日TEL(U)が完全に別のカテゴリであることを確認
 * 
 * AA13533のデータ:
 * - 営担: U
 * - 訪問日: 2026-02-07（未来 = 訪問予定）
 * - 次電日: 2026-02-02（過去 = 当日TEL）
 * - 状況: 追客中
 * 
 * 期待される動作:
 * 1. 訪問予定(U) → 当日TEL(U) をクリック → AA13533が表示される（visitStatus=scheduled）
 * 2. 訪問済み(Y) → 当日TEL(Y) をクリック → AA13533は表示されない（visitStatus=completed）
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

interface TestResult {
  testName: string;
  passed: boolean;
  details: string;
  data?: any;
}

const results: TestResult[] = [];

async function testTodayCallAssignedCategoryExclusivity() {
  console.log('🧪 AA13533の当日TEL（担当）カテゴリー排他性テスト開始\n');
  
  // テスト1: 訪問予定(U)の当日TEL(U) - AA13533が含まれるべき
  console.log('📋 テスト1: 訪問予定(U)の当日TEL(U) - AA13533が含まれるべき');
  try {
    const response1 = await axios.get(`${API_BASE_URL}/api/sellers`, {
      params: {
        statusCategory: 'todayCallAssigned',
        visitAssignee: 'U',
        visitStatus: 'scheduled',  // 訪問予定
        page: 1,
        pageSize: 100,
      },
    });
    
    const sellers1 = response1.data.data;
    const aa13533InScheduled = sellers1.find((s: any) => s.sellerNumber === 'AA13533');
    
    if (aa13533InScheduled) {
      console.log('✅ PASS: AA13533が訪問予定(U)の当日TEL(U)に含まれている');
      console.log(`   - 営担: ${aa13533InScheduled.visitAssignee}`);
      console.log(`   - 訪問日: ${aa13533InScheduled.visitDate}`);
      console.log(`   - 次電日: ${aa13533InScheduled.nextCallDate}`);
      console.log(`   - 状況: ${aa13533InScheduled.status}`);
      results.push({
        testName: '訪問予定(U)の当日TEL(U)にAA13533が含まれる',
        passed: true,
        details: 'AA13533が正しく訪問予定の当日TELカテゴリに含まれている',
        data: aa13533InScheduled,
      });
    } else {
      console.log('❌ FAIL: AA13533が訪問予定(U)の当日TEL(U)に含まれていない');
      console.log(`   取得件数: ${sellers1.length}件`);
      console.log(`   売主番号一覧: ${sellers1.map((s: any) => s.sellerNumber).join(', ')}`);
      results.push({
        testName: '訪問予定(U)の当日TEL(U)にAA13533が含まれる',
        passed: false,
        details: 'AA13533が訪問予定の当日TELカテゴリに含まれていない',
        data: { count: sellers1.length, sellers: sellers1.map((s: any) => s.sellerNumber) },
      });
    }
  } catch (error: any) {
    console.log('❌ ERROR:', error.message);
    results.push({
      testName: '訪問予定(U)の当日TEL(U)にAA13533が含まれる',
      passed: false,
      details: `エラー: ${error.message}`,
    });
  }
  
  console.log('');
  
  // テスト2: 訪問済み(U)の当日TEL(U) - AA13533は含まれないべき
  console.log('📋 テスト2: 訪問済み(U)の当日TEL(U) - AA13533は含まれないべき');
  try {
    const response2 = await axios.get(`${API_BASE_URL}/api/sellers`, {
      params: {
        statusCategory: 'todayCallAssigned',
        visitAssignee: 'U',
        visitStatus: 'completed',  // 訪問済み
        page: 1,
        pageSize: 100,
      },
    });
    
    const sellers2 = response2.data.data;
    const aa13533InCompleted = sellers2.find((s: any) => s.sellerNumber === 'AA13533');
    
    if (!aa13533InCompleted) {
      console.log('✅ PASS: AA13533が訪問済み(U)の当日TEL(U)に含まれていない（正しい）');
      console.log(`   取得件数: ${sellers2.length}件`);
      results.push({
        testName: '訪問済み(U)の当日TEL(U)にAA13533が含まれない',
        passed: true,
        details: 'AA13533が正しく訪問済みの当日TELカテゴリから除外されている',
        data: { count: sellers2.length },
      });
    } else {
      console.log('❌ FAIL: AA13533が訪問済み(U)の当日TEL(U)に含まれている（間違い）');
      console.log(`   - 営担: ${aa13533InCompleted.visitAssignee}`);
      console.log(`   - 訪問日: ${aa13533InCompleted.visitDate}`);
      console.log(`   - 次電日: ${aa13533InCompleted.nextCallDate}`);
      results.push({
        testName: '訪問済み(U)の当日TEL(U)にAA13533が含まれない',
        passed: false,
        details: 'AA13533が訪問済みの当日TELカテゴリに含まれている（カテゴリの排他性が守られていない）',
        data: aa13533InCompleted,
      });
    }
  } catch (error: any) {
    console.log('❌ ERROR:', error.message);
    results.push({
      testName: '訪問済み(U)の当日TEL(U)にAA13533が含まれない',
      passed: false,
      details: `エラー: ${error.message}`,
    });
  }
  
  console.log('');
  
  // テスト3: 訪問予定(Y)の当日TEL(Y) - AA13533は含まれないべき（営担が違う）
  console.log('📋 テスト3: 訪問予定(Y)の当日TEL(Y) - AA13533は含まれないべき（営担が違う）');
  try {
    const response3 = await axios.get(`${API_BASE_URL}/api/sellers`, {
      params: {
        statusCategory: 'todayCallAssigned',
        visitAssignee: 'Y',
        visitStatus: 'scheduled',  // 訪問予定
        page: 1,
        pageSize: 100,
      },
    });
    
    const sellers3 = response3.data.data;
    const aa13533InYScheduled = sellers3.find((s: any) => s.sellerNumber === 'AA13533');
    
    if (!aa13533InYScheduled) {
      console.log('✅ PASS: AA13533が訪問予定(Y)の当日TEL(Y)に含まれていない（正しい）');
      console.log(`   取得件数: ${sellers3.length}件`);
      results.push({
        testName: '訪問予定(Y)の当日TEL(Y)にAA13533が含まれない',
        passed: true,
        details: 'AA13533が正しく営担Yのカテゴリから除外されている',
        data: { count: sellers3.length },
      });
    } else {
      console.log('❌ FAIL: AA13533が訪問予定(Y)の当日TEL(Y)に含まれている（間違い）');
      results.push({
        testName: '訪問予定(Y)の当日TEL(Y)にAA13533が含まれない',
        passed: false,
        details: 'AA13533が営担Yのカテゴリに含まれている（営担フィルターが機能していない）',
        data: aa13533InYScheduled,
      });
    }
  } catch (error: any) {
    console.log('❌ ERROR:', error.message);
    results.push({
      testName: '訪問予定(Y)の当日TEL(Y)にAA13533が含まれない',
      passed: false,
      details: `エラー: ${error.message}`,
    });
  }
  
  console.log('');
  
  // サマリー
  console.log('📊 テスト結果サマリー');
  console.log('='.repeat(60));
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  console.log(`✅ 成功: ${passedCount}/${totalCount}`);
  console.log(`❌ 失敗: ${totalCount - passedCount}/${totalCount}`);
  console.log('');
  
  results.forEach((result, index) => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} テスト${index + 1}: ${result.testName}`);
    console.log(`   ${result.details}`);
  });
  
  console.log('');
  
  if (passedCount === totalCount) {
    console.log('🎉 全てのテストが成功しました！');
    console.log('');
    console.log('✅ カテゴリの排他性が正しく実装されています:');
    console.log('   - 訪問予定(U)の当日TEL(U): AA13533が含まれる');
    console.log('   - 訪問済み(U)の当日TEL(U): AA13533が含まれない');
    console.log('   - 訪問予定(Y)の当日TEL(Y): AA13533が含まれない');
  } else {
    console.log('⚠️  一部のテストが失敗しました。');
    console.log('');
    console.log('🔧 修正が必要な箇所:');
    results.filter(r => !r.passed).forEach(result => {
      console.log(`   - ${result.testName}: ${result.details}`);
    });
  }
}

// テスト実行
testTodayCallAssignedCategoryExclusivity().catch(console.error);
