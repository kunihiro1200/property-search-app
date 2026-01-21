import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

async function testEE2InList() {
  console.log('🔍 EE2がリストに表示されるか確認中...\n');

  const baseUrl = 'https://baikyaku-property-site3.vercel.app/api/public/properties';

  // テスト1: 全物件取得（最初の100件）
  console.log('📊 テスト1: 全物件取得（最初の100件）');
  const test1Url = `${baseUrl}?limit=100&offset=0`;
  
  const response1 = await fetch(test1Url);
  const data1 = await response1.json() as any;
  
  console.log('結果:');
  console.log('- 総件数:', data1.pagination?.total || 0);
  console.log('- 取得件数:', data1.properties?.length || 0);
  
  const hasEE2 = data1.properties?.some((p: any) => p.property_number === 'EE2');
  console.log('- EE2が含まれる:', hasEE2 ? '✅' : '❌');
  
  if (hasEE2) {
    const ee2 = data1.properties.find((p: any) => p.property_number === 'EE2');
    console.log('\nEE2の情報:');
    console.log('- property_number:', ee2.property_number);
    console.log('- address:', ee2.address);
    console.log('- price:', ee2.price);
    console.log('- images:', ee2.images?.length || 0, '件');
    console.log('- atbb_status:', ee2.atbb_status);
  }

  // テスト2: 物件番号で検索
  console.log('\n📊 テスト2: EE2で検索');
  const test2Url = `${baseUrl}?propertyNumber=EE2`;
  
  const response2 = await fetch(test2Url);
  const data2 = await response2.json() as any;
  
  console.log('結果:');
  console.log('- 件数:', data2.properties?.length || 0);
  
  if (data2.properties && data2.properties.length > 0) {
    const ee2 = data2.properties[0];
    console.log('\nEE2の情報:');
    console.log('- property_number:', ee2.property_number);
    console.log('- address:', ee2.address);
    console.log('- price:', ee2.price);
    console.log('- images:', ee2.images?.length || 0, '件');
    console.log('- atbb_status:', ee2.atbb_status);
    console.log('- latitude:', ee2.latitude);
    console.log('- longitude:', ee2.longitude);
  }

  // テスト3: 地図ビュー用（座標あり物件のみ）
  console.log('\n📊 テスト3: 地図ビュー用（座標あり物件のみ）');
  const test3Url = `${baseUrl}?withCoordinates=true&skipImages=true&limit=1000`;
  
  const response3 = await fetch(test3Url);
  const data3 = await response3.json() as any;
  
  console.log('結果:');
  console.log('- 総件数:', data3.pagination?.total || 0);
  console.log('- 取得件数:', data3.properties?.length || 0);
  
  const hasEE2InMap = data3.properties?.some((p: any) => p.property_number === 'EE2');
  console.log('- EE2が含まれる:', hasEE2InMap ? '✅' : '❌');
}

testEE2InList();
