// CC23が公開物件リストに表示されるか確認
import dotenv from 'dotenv';

dotenv.config();

async function checkCC23InPublicList() {
  console.log('=== CC23が公開物件リストに表示されるか確認 ===\n');
  
  const apiUrl = 'http://localhost:3000';
  
  try {
    // 1. 公開物件リストを取得
    console.log('1. 公開物件リストを取得中...');
    const response = await fetch(`${apiUrl}/api/public/properties?limit=1000`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✓ 取得完了: ${data.properties.length}件の物件`);
    
    // 2. CC23を検索
    console.log('\n2. CC23を検索中...');
    const cc23 = data.properties.find((p: any) => p.property_number === 'CC23');
    
    if (!cc23) {
      console.log('❌ CC23が見つかりませんでした');
      console.log('\n物件番号の一覧（最初の20件）:');
      data.properties.slice(0, 20).forEach((p: any) => {
        console.log(`  - ${p.property_number} (${p.atbb_status})`);
      });
      return;
    }
    
    console.log('✓ CC23が見つかりました');
    console.log('\nCC23の情報:');
    console.log('  ID:', cc23.id);
    console.log('  物件番号:', cc23.property_number);
    console.log('  住所:', cc23.address);
    console.log('  ATBB状態:', cc23.atbb_status);
    console.log('  物件タイプ:', cc23.property_type);
    console.log('  価格:', cc23.price ? `${cc23.price}万円` : '（なし）');
    console.log('  クリック可能:', cc23.is_clickable);
    
    // 3. CC23の詳細データを取得
    console.log('\n3. CC23の詳細データを取得中...');
    const detailResponse = await fetch(`${apiUrl}/api/public/properties/${cc23.id}/complete`);
    
    if (!detailResponse.ok) {
      throw new Error(`HTTP ${detailResponse.status}: ${detailResponse.statusText}`);
    }
    
    const detailData = await detailResponse.json();
    console.log('✓ 詳細データ取得完了');
    console.log('  お気に入り文言:', detailData.favoriteComment || '（なし）');
    console.log('  おすすめコメント:', detailData.recommendedComments ? 'あり' : '（なし）');
    if (detailData.recommendedComments) {
      console.log('    件数:', detailData.recommendedComments.length);
    }
    console.log('  物件について:', detailData.propertyAbout || '（なし）');
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    throw error;
  }
}

checkCC23InPublicList().catch(console.error);
