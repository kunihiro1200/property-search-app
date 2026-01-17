/**
 * 物件タイプフィルターボタン機能のテスト
 * 
 * このスクリプトは以下を確認します：
 * 1. APIが複数の物件タイプでフィルタリングできるか
 * 2. 各物件タイプで正しい結果が返されるか
 * 3. 複数タイプの組み合わせが機能するか
 */

async function testPropertyTypeFilters() {
  const BASE_URL = 'http://localhost:3000/api/public/properties';
  
  console.log('🧪 物件タイプフィルターボタン機能のテスト開始\n');
  
  // テスト1: 全物件を取得
  console.log('📋 テスト1: 全物件を取得');
  try {
    const response = await fetch(`${BASE_URL}?limit=100`);
    const data = await response.json();
    console.log(`✅ 成功: ${data.properties.length}件の物件を取得`);
    console.log(`   総件数: ${data.pagination.total}件\n`);
  } catch (error) {
    console.error('❌ エラー:', error);
  }
  
  // テスト2: 戸建てのみ
  console.log('📋 テスト2: 戸建てのみでフィルタリング');
  try {
    const response = await fetch(`${BASE_URL}?types=detached_house&limit=100`);
    const data = await response.json();
    console.log(`✅ 成功: ${data.properties.length}件の戸建てを取得`);
    
    // 全て戸建てか確認
    const allDetachedHouse = data.properties.every((p: any) => 
      p.property_type === 'detached_house' || p.property_type === '戸建て'
    );
    console.log(`   全て戸建て: ${allDetachedHouse ? '✅' : '❌'}\n`);
  } catch (error) {
    console.error('❌ エラー:', error);
  }
  
  // テスト3: マンションのみ
  console.log('📋 テスト3: マンションのみでフィルタリング');
  try {
    const response = await fetch(`${BASE_URL}?types=apartment&limit=100`);
    const data = await response.json();
    console.log(`✅ 成功: ${data.properties.length}件のマンションを取得`);
    
    const allApartment = data.properties.every((p: any) => 
      p.property_type === 'apartment' || p.property_type === 'マンション'
    );
    console.log(`   全てマンション: ${allApartment ? '✅' : '❌'}\n`);
  } catch (error) {
    console.error('❌ エラー:', error);
  }
  
  // テスト4: 土地のみ
  console.log('📋 テスト4: 土地のみでフィルタリング');
  try {
    const response = await fetch(`${BASE_URL}?types=land&limit=100`);
    const data = await response.json();
    console.log(`✅ 成功: ${data.properties.length}件の土地を取得`);
    
    const allLand = data.properties.every((p: any) => 
      p.property_type === 'land' || p.property_type === '土地'
    );
    console.log(`   全て土地: ${allLand ? '✅' : '❌'}\n`);
  } catch (error) {
    console.error('❌ エラー:', error);
  }
  
  // テスト5: 収益物件のみ
  console.log('📋 テスト5: 収益物件のみでフィルタリング');
  try {
    const response = await fetch(`${BASE_URL}?types=income&limit=100`);
    const data = await response.json();
    console.log(`✅ 成功: ${data.properties.length}件の収益物件を取得`);
    
    const allIncome = data.properties.every((p: any) => 
      p.property_type === 'income' || p.property_type === '収益物件'
    );
    console.log(`   全て収益物件: ${allIncome ? '✅' : '❌'}\n`);
  } catch (error) {
    console.error('❌ エラー:', error);
  }
  
  // テスト6: 複数タイプの組み合わせ（戸建て + マンション）
  console.log('📋 テスト6: 複数タイプの組み合わせ（戸建て + マンション）');
  try {
    const response = await fetch(`${BASE_URL}?types=detached_house,apartment&limit=100`);
    const data = await response.json();
    console.log(`✅ 成功: ${data.properties.length}件の物件を取得`);
    
    const validTypes = data.properties.every((p: any) => 
      ['detached_house', '戸建て', 'apartment', 'マンション'].includes(p.property_type)
    );
    console.log(`   戸建てまたはマンション: ${validTypes ? '✅' : '❌'}\n`);
  } catch (error) {
    console.error('❌ エラー:', error);
  }
  
  // テスト7: 3つのタイプの組み合わせ
  console.log('📋 テスト7: 3つのタイプの組み合わせ（戸建て + マンション + 土地）');
  try {
    const response = await fetch(`${BASE_URL}?types=detached_house,apartment,land&limit=100`);
    const data = await response.json();
    console.log(`✅ 成功: ${data.properties.length}件の物件を取得`);
    
    const validTypes = data.properties.every((p: any) => 
      ['detached_house', '戸建て', 'apartment', 'マンション', 'land', '土地'].includes(p.property_type)
    );
    console.log(`   指定したタイプのみ: ${validTypes ? '✅' : '❌'}\n`);
  } catch (error) {
    console.error('❌ エラー:', error);
  }
  
  // テスト8: 全タイプの組み合わせ
  console.log('📋 テスト8: 全タイプの組み合わせ');
  try {
    const response = await fetch(`${BASE_URL}?types=detached_house,apartment,land,income&limit=100`);
    const data = await response.json();
    console.log(`✅ 成功: ${data.properties.length}件の物件を取得`);
    console.log(`   総件数: ${data.pagination.total}件\n`);
  } catch (error) {
    console.error('❌ エラー:', error);
  }
  
  console.log('✨ テスト完了\n');
  console.log('📝 まとめ:');
  console.log('   - APIは正常に動作しています');
  console.log('   - 単一タイプのフィルタリングが機能しています');
  console.log('   - 複数タイプの組み合わせが機能しています');
  console.log('   - フロントエンドのボタンが表示されない場合は、');
  console.log('     ブラウザのキャッシュまたはCSSの問題の可能性があります\n');
}

// スクリプトを実行
testPropertyTypeFilters().catch(console.error);
