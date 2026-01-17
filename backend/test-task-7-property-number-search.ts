/**
 * Task 7: 物件番号検索エンドポイントのテスト
 * 
 * このスクリプトは以下をテストします：
 * 1. 認証なしでアクセスした場合、401エラーが返される
 * 2. 物件番号が指定されていない場合、400エラーが返される
 * 3. 完全一致検索が正しく動作する
 * 4. 部分一致検索が正しく動作する
 */

import axios from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';

interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

// テスト用の認証トークンを取得（実際の環境に合わせて調整）
async function getAuthToken(): Promise<string | null> {
  try {
    // 実際の認証エンドポイントを使用
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: process.env.TEST_USER_EMAIL || 'test@example.com',
      password: process.env.TEST_USER_PASSWORD || 'test123'
    });
    
    return response.data.token;
  } catch (error: any) {
    console.error('認証トークンの取得に失敗しました:', error.message);
    return null;
  }
}

// テスト1: 認証なしでアクセス（401エラーを期待）
async function testUnauthenticatedAccess() {
  const testName = 'Test 1: 認証なしでアクセス（401エラーを期待）';
  
  try {
    await axios.get(`${API_BASE_URL}/public/internal/properties/search`, {
      params: { propertyNumber: 'AA12345' }
    });
    
    results.push({
      testName,
      passed: false,
      message: '401エラーが返されるべきですが、リクエストが成功しました'
    });
  } catch (error: any) {
    if (error.response?.status === 401) {
      results.push({
        testName,
        passed: true,
        message: '期待通り401エラーが返されました',
        details: error.response.data
      });
    } else {
      results.push({
        testName,
        passed: false,
        message: `予期しないエラー: ${error.response?.status || error.message}`,
        details: error.response?.data
      });
    }
  }
}

// テスト2: 物件番号なしでアクセス（400エラーを期待）
async function testMissingPropertyNumber(token: string) {
  const testName = 'Test 2: 物件番号なしでアクセス（400エラーを期待）';
  
  try {
    await axios.get(`${API_BASE_URL}/public/internal/properties/search`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    results.push({
      testName,
      passed: false,
      message: '400エラーが返されるべきですが、リクエストが成功しました'
    });
  } catch (error: any) {
    if (error.response?.status === 400) {
      results.push({
        testName,
        passed: true,
        message: '期待通り400エラーが返されました',
        details: error.response.data
      });
    } else {
      results.push({
        testName,
        passed: false,
        message: `予期しないエラー: ${error.response?.status || error.message}`,
        details: error.response?.data
      });
    }
  }
}

// テスト3: 空の物件番号でアクセス（400エラーを期待）
async function testEmptyPropertyNumber(token: string) {
  const testName = 'Test 3: 空の物件番号でアクセス（400エラーを期待）';
  
  try {
    await axios.get(`${API_BASE_URL}/public/internal/properties/search`, {
      params: { propertyNumber: '   ' },
      headers: { Authorization: `Bearer ${token}` }
    });
    
    results.push({
      testName,
      passed: false,
      message: '400エラーが返されるべきですが、リクエストが成功しました'
    });
  } catch (error: any) {
    if (error.response?.status === 400) {
      results.push({
        testName,
        passed: true,
        message: '期待通り400エラーが返されました',
        details: error.response.data
      });
    } else {
      results.push({
        testName,
        passed: false,
        message: `予期しないエラー: ${error.response?.status || error.message}`,
        details: error.response?.data
      });
    }
  }
}

// テスト4: 完全一致検索
async function testExactMatch(token: string) {
  const testName = 'Test 4: 完全一致検索';
  
  try {
    const response = await axios.get(`${API_BASE_URL}/public/internal/properties/search`, {
      params: { 
        propertyNumber: 'AA13129',
        exact: 'true'
      },
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const { properties, count, searchTerm, exactMatch } = response.data;
    
    // 検証
    const allMatch = properties.every((p: any) => p.property_number === 'AA13129');
    
    if (exactMatch === true && allMatch) {
      results.push({
        testName,
        passed: true,
        message: `完全一致検索が正しく動作しました（${count}件）`,
        details: { count, searchTerm, exactMatch, sampleProperty: properties[0]?.property_number }
      });
    } else {
      results.push({
        testName,
        passed: false,
        message: '完全一致検索の結果が期待と異なります',
        details: { count, exactMatch, allMatch, properties: properties.map((p: any) => p.property_number) }
      });
    }
  } catch (error: any) {
    results.push({
      testName,
      passed: false,
      message: `エラーが発生しました: ${error.message}`,
      details: error.response?.data
    });
  }
}

// テスト5: 部分一致検索
async function testPartialMatch(token: string) {
  const testName = 'Test 5: 部分一致検索';
  
  try {
    const response = await axios.get(`${API_BASE_URL}/public/internal/properties/search`, {
      params: { 
        propertyNumber: 'AA131',
        exact: 'false'
      },
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const { properties, count, searchTerm, exactMatch } = response.data;
    
    // 検証: すべての物件番号に'AA131'が含まれているか
    const allMatch = properties.every((p: any) => 
      p.property_number.toLowerCase().includes('aa131')
    );
    
    if (exactMatch === false && allMatch && count > 0) {
      results.push({
        testName,
        passed: true,
        message: `部分一致検索が正しく動作しました（${count}件）`,
        details: { 
          count, 
          searchTerm, 
          exactMatch, 
          sampleProperties: properties.slice(0, 3).map((p: any) => p.property_number) 
        }
      });
    } else {
      results.push({
        testName,
        passed: false,
        message: '部分一致検索の結果が期待と異なります',
        details: { 
          count, 
          exactMatch, 
          allMatch, 
          properties: properties.slice(0, 5).map((p: any) => p.property_number) 
        }
      });
    }
  } catch (error: any) {
    results.push({
      testName,
      passed: false,
      message: `エラーが発生しました: ${error.message}`,
      details: error.response?.data
    });
  }
}

// テスト6: デフォルトで部分一致検索（exactパラメータなし）
async function testDefaultPartialMatch(token: string) {
  const testName = 'Test 6: デフォルトで部分一致検索（exactパラメータなし）';
  
  try {
    const response = await axios.get(`${API_BASE_URL}/public/internal/properties/search`, {
      params: { propertyNumber: 'AA12' },
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const { properties, count, exactMatch } = response.data;
    
    // 検証: exactMatchがfalseであること
    if (exactMatch === false && count > 0) {
      results.push({
        testName,
        passed: true,
        message: `デフォルトで部分一致検索が動作しました（${count}件）`,
        details: { count, exactMatch }
      });
    } else {
      results.push({
        testName,
        passed: false,
        message: 'デフォルトの動作が期待と異なります',
        details: { count, exactMatch }
      });
    }
  } catch (error: any) {
    results.push({
      testName,
      passed: false,
      message: `エラーが発生しました: ${error.message}`,
      details: error.response?.data
    });
  }
}

// メイン実行関数
async function runTests() {
  console.log('='.repeat(80));
  console.log('Task 7: 物件番号検索エンドポイントのテスト');
  console.log('='.repeat(80));
  console.log();

  // テスト1: 認証なしでアクセス
  await testUnauthenticatedAccess();

  // 認証トークンを取得
  console.log('認証トークンを取得中...');
  const token = await getAuthToken();
  
  if (!token) {
    console.error('認証トークンの取得に失敗しました。残りのテストをスキップします。');
    console.log('\n注意: 認証が必要なテストを実行するには、以下の環境変数を設定してください:');
    console.log('  TEST_USER_EMAIL=your-email@example.com');
    console.log('  TEST_USER_PASSWORD=your-password');
  } else {
    console.log('認証トークンを取得しました\n');

    // テスト2-6: 認証が必要なテスト
    await testMissingPropertyNumber(token);
    await testEmptyPropertyNumber(token);
    await testExactMatch(token);
    await testPartialMatch(token);
    await testDefaultPartialMatch(token);
  }

  // 結果を表示
  console.log('\n' + '='.repeat(80));
  console.log('テスト結果');
  console.log('='.repeat(80));
  
  let passedCount = 0;
  let failedCount = 0;

  results.forEach((result, index) => {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    const color = result.passed ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';
    
    console.log(`\n${color}${status}${reset} ${result.testName}`);
    console.log(`  ${result.message}`);
    
    if (result.details) {
      console.log('  詳細:', JSON.stringify(result.details, null, 2).split('\n').join('\n  '));
    }
    
    if (result.passed) {
      passedCount++;
    } else {
      failedCount++;
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log(`合計: ${results.length}件のテスト`);
  console.log(`成功: ${passedCount}件`);
  console.log(`失敗: ${failedCount}件`);
  console.log('='.repeat(80));

  // 終了コード
  process.exit(failedCount > 0 ? 1 : 0);
}

// テスト実行
runTests().catch(error => {
  console.error('テスト実行中にエラーが発生しました:', error);
  process.exit(1);
});
