// 複数の物件のパフォーマンステスト
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function testMultipleProperties() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  console.log('=== 複数物件のパフォーマンステスト ===\n');
  
  // ランダムに10件の物件を取得
  const { data: properties, error } = await supabase
    .from('property_listings')
    .select('property_number, atbb_status')
    .limit(10);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`テスト対象: ${properties.length}件の物件\n`);
  
  const results: { propertyNumber: string; time: number; status: string }[] = [];
  
  for (const property of properties) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(
        `https://baikyaku-property-site3.vercel.app/api/public/properties/${property.property_number}/complete`
      );
      
      const elapsed = Date.now() - startTime;
      const data = await response.json();
      
      results.push({
        propertyNumber: property.property_number,
        time: elapsed,
        status: property.atbb_status || '未設定'
      });
      
      const timeStr = (elapsed / 1000).toFixed(2);
      const icon = elapsed < 5000 ? '✓' : '✗';
      console.log(`${icon} ${property.property_number}: ${timeStr}秒 (${property.atbb_status || '未設定'})`);
      
    } catch (error: any) {
      console.error(`✗ ${property.property_number}: エラー - ${error.message}`);
    }
  }
  
  // 統計情報
  const times = results.map(r => r.time);
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const maxTime = Math.max(...times);
  const minTime = Math.min(...times);
  const fastCount = times.filter(t => t < 5000).length;
  
  console.log('\n=== 統計情報 ===');
  console.log(`平均: ${(avgTime / 1000).toFixed(2)}秒`);
  console.log(`最速: ${(minTime / 1000).toFixed(2)}秒`);
  console.log(`最遅: ${(maxTime / 1000).toFixed(2)}秒`);
  console.log(`5秒以内: ${fastCount}/${times.length}件 (${((fastCount / times.length) * 100).toFixed(1)}%)`);
  
  if (fastCount === times.length) {
    console.log('\n✓ すべての物件が5秒以内で表示されます！');
  } else {
    console.log(`\n✗ ${times.length - fastCount}件の物件が5秒以上かかっています`);
  }
}

testMultipleProperties().catch(console.error);
