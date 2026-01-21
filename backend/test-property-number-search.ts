import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

async function testPropertyNumberSearch() {
  console.log('🔍 物件番号検索のテスト中...\n');

  const baseUrl = 'https://baikyaku-property-site3.vercel.app/api/public/properties';

  // テスト1: CC21で検索（完全一致）
  console.log('📊 テスト1: CC21で検索（完全一致）');
  const test1Url = `${baseUrl}?propertyNumber=CC21&limit=100`;
  console.log('URL:', test1Url);
  
  const response1 = await fetch(test1Url);
  const data1 = await response1.json() as any;
  
  console.log('結果:');
  console.log('- 件数:', data1.properties?.length || 0);
  if (data1.properties && data1.properties.length > 0) {
    console.log('- 物件番号:');
    data1.properties.forEach((p: any) => {
      console.log(`  - ${p.property_number}`);
    });
  }
  
  // CC21のみが返されることを確認
  const hasCC21 = data1.properties?.some((p: any) => p.property_number === 'CC21');
  const hasCC210 = data1.properties?.some((p: any) => p.property_number === 'CC210');
  const hasCC2 = data1.properties?.some((p: any) => p.property_number === 'CC2');
  
  console.log('\n検証:');
  console.log('- CC21が含まれる:', hasCC21 ? '✅' : '❌');
  console.log('- CC210が含まれる:', hasCC210 ? '❌（期待通り）' : '✅');
  console.log('- CC2が含まれる:', hasCC2 ? '❌（期待通り）' : '✅');

  // テスト2: 住所検索（部分一致）
  console.log('\n📊 テスト2: 住所検索（部分一致）- "大分市"');
  const test2Url = `${baseUrl}?location=大分市&limit=10`;
  console.log('URL:', test2Url);
  
  const response2 = await fetch(test2Url);
  const data2 = await response2.json() as any;
  
  console.log('結果:');
  console.log('- 件数:', data2.properties?.length || 0);
  if (data2.properties && data2.properties.length > 0) {
    console.log('- 最初の5件の住所:');
    data2.properties.slice(0, 5).forEach((p: any) => {
      console.log(`  - ${p.property_number}: ${p.address}`);
    });
  }
  
  // 大分市が含まれることを確認
  const allContainOita = data2.properties?.every((p: any) => p.address?.includes('大分市'));
  console.log('\n検証:');
  console.log('- 全ての物件に"大分市"が含まれる:', allContainOita ? '✅' : '❌');
}

testPropertyNumberSearch();
