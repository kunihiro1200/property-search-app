import dotenv from 'dotenv';
import { PropertyListingService } from './src/services/PropertyListingService';

dotenv.config();

async function testWithCoordinatesParam() {
  const service = new PropertyListingService();

  console.log('🧪 withCoordinatesパラメータのテスト\n');

  // 1. withCoordinates=falseの場合（デフォルト）
  console.log('📊 withCoordinates=false（全物件）:');
  const resultWithoutFilter = await service.getPublicProperties({
    limit: 10,
    offset: 0,
    withCoordinates: false,
  });
  
  console.log(`  取得件数: ${resultWithoutFilter.properties.length}件`);
  console.log(`  総件数: ${resultWithoutFilter.pagination.total}件`);
  console.log('  最初の5件:');
  resultWithoutFilter.properties.slice(0, 5).forEach(p => {
    console.log(`    ${p.property_number}: lat=${p.latitude}, lng=${p.longitude}`);
  });

  // 2. withCoordinates=trueの場合
  console.log('\n📍 withCoordinates=true（座標がある物件のみ）:');
  const resultWithFilter = await service.getPublicProperties({
    limit: 10,
    offset: 0,
    withCoordinates: true,
  });
  
  console.log(`  取得件数: ${resultWithFilter.properties.length}件`);
  console.log(`  総件数: ${resultWithFilter.pagination.total}件`);
  console.log('  最初の5件:');
  resultWithFilter.properties.slice(0, 5).forEach(p => {
    console.log(`    ${p.property_number}: lat=${p.latitude}, lng=${p.longitude}`);
  });

  // 3. 座標がnullの物件が含まれているかチェック
  const hasNullCoordinates = resultWithFilter.properties.some(
    p => p.latitude === null || p.longitude === null
  );
  
  if (hasNullCoordinates) {
    console.log('\n❌ エラー: 座標がnullの物件が含まれています！');
    const nullProps = resultWithFilter.properties.filter(
      p => p.latitude === null || p.longitude === null
    );
    console.log(`  座標がnullの物件: ${nullProps.length}件`);
    nullProps.forEach(p => {
      console.log(`    ${p.property_number}`);
    });
  } else {
    console.log('\n✅ 成功: 全ての物件に座標があります');
  }
}

testWithCoordinatesParam().catch(console.error);
