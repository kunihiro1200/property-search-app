/**
 * 物件タイプフィルターAPI診断スクリプト
 * 
 * このスクリプトは以下を確認します:
 * 1. バックエンドAPIが起動しているか
 * 2. 物件タイプフィルターが正しく動作するか
 * 3. レスポンスデータが正しい形式か
 */

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'warning';
  detail?: string;
  count?: number;
  types?: Record<string, number>;
}

async function testPropertyTypeFilterAPI() {
  console.log('🔍 物件タイプフィルターAPI診断を開始します...\n');

  const baseUrl = 'http://localhost:3000';
  const tests: TestResult[] = [];

  // Test 1: バックエンドAPIの起動確認
  console.log('📡 Test 1: バックエンドAPI接続テスト');
  try {
    const response = await fetch(`${baseUrl}/api/public/properties?limit=1`);
    if (response.ok) {
      console.log('✅ バックエンドAPIが起動しています');
      tests.push({ name: 'API接続', status: 'success' });
    } else {
      console.log(`❌ APIエラー: ${response.status} ${response.statusText}`);
      tests.push({ name: 'API接続', status: 'error', detail: response.statusText });
    }
  } catch (error: any) {
    console.log(`❌ バックエンドAPIに接続できません: ${error.message}`);
    console.log('💡 対処方法: cd backend && npm run dev');
    tests.push({ name: 'API接続', status: 'error', detail: error.message });
    return;
  }
  console.log('');

  // Test 2: 物件タイプフィルター（単一）
  console.log('📡 Test 2: 物件タイプフィルター（戸建て）');
  try {
    const response = await fetch(`${baseUrl}/api/public/properties?types=detached_house&limit=5`);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ 戸建てフィルター成功: ${data.properties?.length || 0}件取得`);
      
      // データ検証
      if (data.properties && data.properties.length > 0) {
        const allDetachedHouse = data.properties.every((p: any) => 
          p.propertyType === 'detached_house' || p.propertyType === '戸建て'
        );
        if (allDetachedHouse) {
          console.log('✅ すべての物件が戸建てです');
        } else {
          console.log('⚠️  戸建て以外の物件が含まれています');
        }
      }
      tests.push({ name: '戸建てフィルター', status: 'success', count: data.properties?.length });
    } else {
      console.log(`❌ フィルターエラー: ${response.status}`);
      tests.push({ name: '戸建てフィルター', status: 'error' });
    }
  } catch (error: any) {
    console.log(`❌ エラー: ${error.message}`);
    tests.push({ name: '戸建てフィルター', status: 'error', detail: error.message });
  }
  console.log('');

  // Test 3: 物件タイプフィルター（複数）
  console.log('📡 Test 3: 物件タイプフィルター（複数選択）');
  try {
    const response = await fetch(`${baseUrl}/api/public/properties?types=detached_house,apartment&limit=10`);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ 複数フィルター成功: ${data.properties?.length || 0}件取得`);
      
      if (data.properties && data.properties.length > 0) {
        const validTypes = data.properties.every((p: any) => 
          ['detached_house', 'apartment', '戸建て', 'マンション'].includes(p.propertyType)
        );
        if (validTypes) {
          console.log('✅ すべての物件が指定タイプです');
        } else {
          console.log('⚠️  指定外のタイプが含まれています');
        }
      }
      tests.push({ name: '複数フィルター', status: 'success', count: data.properties?.length });
    } else {
      console.log(`❌ フィルターエラー: ${response.status}`);
      tests.push({ name: '複数フィルター', status: 'error' });
    }
  } catch (error: any) {
    console.log(`❌ エラー: ${error.message}`);
    tests.push({ name: '複数フィルター', status: 'error', detail: error.message });
  }
  console.log('');

  // Test 4: 全物件タイプの確認
  console.log('📡 Test 4: 全物件タイプの確認');
  try {
    const response = await fetch(`${baseUrl}/api/public/properties?limit=100`);
    const data = await response.json();
    
    if (response.ok && data.properties) {
      const typeCount: Record<string, number> = {};
      data.properties.forEach((p: any) => {
        typeCount[p.propertyType] = (typeCount[p.propertyType] || 0) + 1;
      });
      
      console.log('✅ 物件タイプ分布:');
      Object.entries(typeCount).forEach(([type, count]) => {
        console.log(`   - ${type}: ${count}件`);
      });
      tests.push({ name: '物件タイプ分布', status: 'success', types: typeCount });
    }
  } catch (error: any) {
    console.log(`❌ エラー: ${error.message}`);
    tests.push({ name: '物件タイプ分布', status: 'error', detail: error.message });
  }
  console.log('');

  // Test 5: レスポンス形式の確認
  console.log('📡 Test 5: レスポンス形式の確認');
  try {
    const response = await fetch(`${baseUrl}/api/public/properties?limit=1`);
    const data = await response.json();
    
    const hasProperties = Array.isArray(data.properties);
    const hasPagination = data.pagination && typeof data.pagination.total === 'number';
    
    if (hasProperties && hasPagination) {
      console.log('✅ レスポンス形式が正しいです');
      console.log(`   - properties: ${data.properties.length}件`);
      console.log(`   - pagination.total: ${data.pagination.total}件`);
      tests.push({ name: 'レスポンス形式', status: 'success' });
    } else {
      console.log('⚠️  レスポンス形式に問題があります');
      console.log(`   - properties配列: ${hasProperties ? 'OK' : 'NG'}`);
      console.log(`   - pagination: ${hasPagination ? 'OK' : 'NG'}`);
      tests.push({ name: 'レスポンス形式', status: 'warning' });
    }
  } catch (error: any) {
    console.log(`❌ エラー: ${error.message}`);
    tests.push({ name: 'レスポンス形式', status: 'error', detail: error.message });
  }
  console.log('');

  // 診断結果サマリー
  console.log('=' .repeat(60));
  console.log('📊 診断結果サマリー');
  console.log('=' .repeat(60));
  
  const successCount = tests.filter(t => t.status === 'success').length;
  const errorCount = tests.filter(t => t.status === 'error').length;
  const warningCount = tests.filter(t => t.status === 'warning').length;
  
  console.log(`✅ 成功: ${successCount}/${tests.length}`);
  console.log(`❌ エラー: ${errorCount}/${tests.length}`);
  console.log(`⚠️  警告: ${warningCount}/${tests.length}`);
  console.log('');

  if (errorCount === 0) {
    console.log('🎉 バックエンドAPIは正常に動作しています！');
    console.log('');
    console.log('📋 次のステップ:');
    console.log('1. フロントエンドサーバーが起動しているか確認');
    console.log('   → cd frontend && npm run dev');
    console.log('2. ブラウザで http://localhost:5173/public/properties を開く');
    console.log('3. F12で開発者ツールを開き、以下を確認:');
    console.log('   - Console: エラーメッセージがないか');
    console.log('   - Elements: property-type-filter-buttons が存在するか');
    console.log('   - Network: CSSファイルが読み込まれているか');
  } else {
    console.log('⚠️  問題が検出されました。上記のエラーを確認してください。');
  }
}

// スクリプト実行
testPropertyTypeFilterAPI().catch(console.error);
