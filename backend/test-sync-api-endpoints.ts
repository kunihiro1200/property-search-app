/**
 * スプレッドシート同期API エンドポイントテスト
 * 
 * バックエンドサーバーが起動している状態で実行してください
 */

import axios from 'axios';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_PREFIX = '/api/sync';

interface ApiTestResult {
  endpoint: string;
  method: string;
  success: boolean;
  statusCode?: number;
  message: string;
  responseData?: any;
  error?: string;
}

const results: ApiTestResult[] = [];

/**
 * APIテスト1: 同期ステータスの取得
 */
async function testGetSyncStatus(): Promise<ApiTestResult> {
  const endpoint = `${API_PREFIX}/status`;
  console.log(`\nテスト: GET ${endpoint}`);
  
  try {
    const response = await axios.get(`${BASE_URL}${endpoint}`);
    
    console.log(`✓ ステータスコード: ${response.status}`);
    console.log(`✓ レスポンス:`, JSON.stringify(response.data, null, 2));
    
    return {
      endpoint,
      method: 'GET',
      success: response.status === 200,
      statusCode: response.status,
      message: '同期ステータスを正常に取得しました',
      responseData: response.data,
    };
  } catch (error: any) {
    return {
      endpoint,
      method: 'GET',
      success: false,
      statusCode: error.response?.status,
      message: 'ステータス取得に失敗しました',
      error: error.message,
    };
  }
}

/**
 * APIテスト2: 同期履歴の取得
 */
async function testGetSyncHistory(): Promise<ApiTestResult> {
  const endpoint = `${API_PREFIX}/history?limit=10`;
  console.log(`\nテスト: GET ${endpoint}`);
  
  try {
    const response = await axios.get(`${BASE_URL}${endpoint}`);
    
    console.log(`✓ ステータスコード: ${response.status}`);
    console.log(`✓ 履歴件数: ${response.data.data?.entries?.length || 0}件`);
    
    return {
      endpoint,
      method: 'GET',
      success: response.status === 200,
      statusCode: response.status,
      message: `同期履歴を正常に取得しました (${response.data.data?.entries?.length || 0}件)`,
      responseData: response.data,
    };
  } catch (error: any) {
    return {
      endpoint,
      method: 'GET',
      success: false,
      statusCode: error.response?.status,
      message: '履歴取得に失敗しました',
      error: error.message,
    };
  }
}

/**
 * APIテスト3: エラーログの取得
 */
async function testGetErrorLogs(): Promise<ApiTestResult> {
  const endpoint = `${API_PREFIX}/errors?limit=10`;
  console.log(`\nテスト: GET ${endpoint}`);
  
  try {
    const response = await axios.get(`${BASE_URL}${endpoint}`);
    
    console.log(`✓ ステータスコード: ${response.status}`);
    console.log(`✓ エラーログ件数: ${response.data.data?.length || 0}件`);
    
    return {
      endpoint,
      method: 'GET',
      success: response.status === 200,
      statusCode: response.status,
      message: `エラーログを正常に取得しました (${response.data.data?.length || 0}件)`,
      responseData: response.data,
    };
  } catch (error: any) {
    return {
      endpoint,
      method: 'GET',
      success: false,
      statusCode: error.response?.status,
      message: 'エラーログ取得に失敗しました',
      error: error.message,
    };
  }
}

/**
 * APIテスト4: レート制限の確認
 */
async function testGetRateLimit(): Promise<ApiTestResult> {
  const endpoint = `${API_PREFIX}/rate-limit`;
  console.log(`\nテスト: GET ${endpoint}`);
  
  try {
    const response = await axios.get(`${BASE_URL}${endpoint}`);
    
    console.log(`✓ ステータスコード: ${response.status}`);
    console.log(`✓ レート制限情報:`, JSON.stringify(response.data.data, null, 2));
    
    return {
      endpoint,
      method: 'GET',
      success: response.status === 200,
      statusCode: response.status,
      message: 'レート制限情報を正常に取得しました',
      responseData: response.data,
    };
  } catch (error: any) {
    return {
      endpoint,
      method: 'GET',
      success: false,
      statusCode: error.response?.status,
      message: 'レート制限情報取得に失敗しました',
      error: error.message,
    };
  }
}

/**
 * APIテスト5: 手動同期の進行状況確認
 */
async function testGetManualSyncProgress(): Promise<ApiTestResult> {
  const endpoint = `${API_PREFIX}/manual/progress`;
  console.log(`\nテスト: GET ${endpoint}`);
  
  try {
    const response = await axios.get(`${BASE_URL}${endpoint}`);
    
    console.log(`✓ ステータスコード: ${response.status}`);
    console.log(`✓ 同期実行中: ${response.data.data?.isRunning ? 'はい' : 'いいえ'}`);
    
    return {
      endpoint,
      method: 'GET',
      success: response.status === 200,
      statusCode: response.status,
      message: '手動同期の進行状況を正常に取得しました',
      responseData: response.data,
    };
  } catch (error: any) {
    return {
      endpoint,
      method: 'GET',
      success: false,
      statusCode: error.response?.status,
      message: '進行状況取得に失敗しました',
      error: error.message,
    };
  }
}

/**
 * APIテスト6: スナップショット一覧の取得
 */
async function testGetSnapshots(): Promise<ApiTestResult> {
  const endpoint = `${API_PREFIX}/snapshots?limit=10`;
  console.log(`\nテスト: GET ${endpoint}`);
  
  try {
    const response = await axios.get(`${BASE_URL}${endpoint}`);
    
    console.log(`✓ ステータスコード: ${response.status}`);
    console.log(`✓ スナップショット件数: ${response.data.data?.length || 0}件`);
    
    return {
      endpoint,
      method: 'GET',
      success: response.status === 200,
      statusCode: response.status,
      message: `スナップショット一覧を正常に取得しました (${response.data.data?.length || 0}件)`,
      responseData: response.data,
    };
  } catch (error: any) {
    return {
      endpoint,
      method: 'GET',
      success: false,
      statusCode: error.response?.status,
      message: 'スナップショット一覧取得に失敗しました',
      error: error.message,
    };
  }
}

/**
 * APIテスト7: 不足している売主の検出
 */
async function testGetMissingSellers(): Promise<ApiTestResult> {
  const endpoint = `${API_PREFIX}/missing`;
  console.log(`\nテスト: GET ${endpoint}`);
  
  try {
    const response = await axios.get(`${BASE_URL}${endpoint}`);
    
    console.log(`✓ ステータスコード: ${response.status}`);
    console.log(`✓ 不足している売主: ${response.data.data?.count || 0}件`);
    
    return {
      endpoint,
      method: 'GET',
      success: response.status === 200,
      statusCode: response.status,
      message: `不足している売主を検出しました (${response.data.data?.count || 0}件)`,
      responseData: response.data,
    };
  } catch (error: any) {
    return {
      endpoint,
      method: 'GET',
      success: false,
      statusCode: error.response?.status,
      message: '不足売主検出に失敗しました',
      error: error.message,
    };
  }
}

/**
 * APIテスト8: 定期同期のステータス確認
 */
async function testGetPeriodicSyncStatus(): Promise<ApiTestResult> {
  const endpoint = `${API_PREFIX}/periodic/status`;
  console.log(`\nテスト: GET ${endpoint}`);
  
  try {
    const response = await axios.get(`${BASE_URL}${endpoint}`);
    
    console.log(`✓ ステータスコード: ${response.status}`);
    console.log(`✓ 定期同期アクティブ: ${response.data.data?.isActive ? 'はい' : 'いいえ'}`);
    console.log(`✓ 同期間隔: ${response.data.data?.intervalMinutes || 0}分`);
    
    return {
      endpoint,
      method: 'GET',
      success: response.status === 200,
      statusCode: response.status,
      message: '定期同期のステータスを正常に取得しました',
      responseData: response.data,
    };
  } catch (error: any) {
    return {
      endpoint,
      method: 'GET',
      success: false,
      statusCode: error.response?.status,
      message: '定期同期ステータス取得に失敗しました',
      error: error.message,
    };
  }
}

/**
 * すべてのAPIテストを実行
 */
async function runAllApiTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  スプレッドシート同期API - エンドポイントテスト           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nベースURL: ${BASE_URL}`);
  console.log('注意: バックエンドサーバーが起動している必要があります\n');
  
  // サーバーの接続確認
  try {
    await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    console.log('✓ バックエンドサーバーに接続しました\n');
  } catch (error) {
    console.error('✗ バックエンドサーバーに接続できません');
    console.error('  サーバーを起動してから再度実行してください: npm run dev\n');
    process.exit(1);
  }
  
  // 読み取り専用のテストを実行（安全）
  results.push(await testGetSyncStatus());
  results.push(await testGetSyncHistory());
  results.push(await testGetErrorLogs());
  results.push(await testGetRateLimit());
  results.push(await testGetManualSyncProgress());
  results.push(await testGetSnapshots());
  results.push(await testGetMissingSellers());
  results.push(await testGetPeriodicSyncStatus());
  
  // 結果サマリーを表示
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  APIテスト結果サマリー                                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  results.forEach((result, index) => {
    const icon = result.success ? '✓' : '✗';
    const status = result.success ? '成功' : '失敗';
    console.log(`${icon} Test ${index + 1}: ${result.method} ${result.endpoint}`);
    console.log(`   ステータス: ${status} (${result.statusCode || 'N/A'})`);
    console.log(`   ${result.message}`);
    if (!result.success && result.error) {
      console.log(`   エラー: ${result.error}`);
    }
    console.log('');
  });
  
  console.log('─'.repeat(60));
  console.log(`合計: ${results.length}件 | 成功: ${passed}件 | 失敗: ${failed}件`);
  console.log('─'.repeat(60));
  
  if (failed === 0) {
    console.log('\n🎉 すべてのAPIテストが成功しました！');
    console.log('\n次のステップ:');
    console.log('1. フロントエンドから同期機能を確認');
    console.log('2. 手動同期を実行してデータの整合性を確認');
    console.log('3. エラーログを監視して問題がないか確認');
  } else {
    console.log('\n⚠️  一部のAPIテストが失敗しました。');
    console.log('   上記の詳細を確認して問題を修正してください。');
    process.exit(1);
  }
}

// テストを実行
runAllApiTests().catch(error => {
  console.error('\n❌ APIテスト実行中に予期しないエラーが発生しました:');
  console.error(error);
  process.exit(1);
});
