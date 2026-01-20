import dotenv from 'dotenv';
import { PropertyListingService } from './src/services/PropertyListingService';

dotenv.config();

async function diagnosePaginationPerformance() {
  console.log('🔍 ページネーション性能診断\n');
  
  const service = new PropertyListingService();
  
  // テスト1: 1ページ目（0-20件）
  console.log('📊 テスト1: 1ページ目（0-20件）');
  const start1 = Date.now();
  const result1 = await service.getPublicProperties({
    limit: 20,
    offset: 0,
  });
  const time1 = Date.now() - start1;
  console.log(`  取得件数: ${result1.properties.length}件`);
  console.log(`  処理時間: ${time1}ms`);
  console.log(`  画像あり: ${result1.properties.filter(p => p.image_url).length}件\n`);
  
  // テスト2: 2ページ目（20-40件）
  console.log('📊 テスト2: 2ページ目（20-40件）');
  const start2 = Date.now();
  const result2 = await service.getPublicProperties({
    limit: 20,
    offset: 20,
  });
  const time2 = Date.now() - start2;
  console.log(`  取得件数: ${result2.properties.length}件`);
  console.log(`  処理時間: ${time2}ms`);
  console.log(`  画像あり: ${result2.properties.filter(p => p.image_url).length}件\n`);
  
  // テスト3: 3ページ目（40-60件）
  console.log('📊 テスト3: 3ページ目（40-60件）');
  const start3 = Date.now();
  const result3 = await service.getPublicProperties({
    limit: 20,
    offset: 40,
  });
  const time3 = Date.now() - start3;
  console.log(`  取得件数: ${result3.properties.length}件`);
  console.log(`  処理時間: ${time3}ms`);
  console.log(`  画像あり: ${result3.properties.filter(p => p.image_url).length}件\n`);
  
  console.log('📊 サマリー:');
  console.log(`  平均処理時間: ${((time1 + time2 + time3) / 3).toFixed(0)}ms`);
  console.log(`  最大処理時間: ${Math.max(time1, time2, time3)}ms`);
  console.log(`  最小処理時間: ${Math.min(time1, time2, time3)}ms`);
  
  // 画像取得が原因かチェック
  if (time1 > 3000 || time2 > 3000 || time3 > 3000) {
    console.log('\n⚠️ 処理時間が3秒以上かかっています');
    console.log('原因: Google Drive APIからの画像取得が遅い可能性があります');
    console.log('解決策: image_urlをデータベースに事前保存する必要があります');
  }
}

diagnosePaginationPerformance();
