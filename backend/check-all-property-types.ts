/**
 * すべての物件番号形式を確認
 * 
 * データベースに存在する物件番号の形式を分析
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🔍 すべての物件番号形式を確認中...\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // すべての物件番号を取得
  const allPropertyNumbers: string[] = [];
  const pageSize = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('property_listings')
      .select('property_number')
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('❌ エラー:', error.message);
      return;
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allPropertyNumbers.push(...data.map(p => p.property_number).filter(Boolean));
      offset += pageSize;
      
      if (data.length < pageSize) {
        hasMore = false;
      }
    }
  }

  console.log(`📊 合計物件数: ${allPropertyNumbers.length}\n`);

  // 物件番号の形式を分類
  const patterns: Record<string, string[]> = {
    'AA形式': [],
    'BB形式': [],
    'CC形式': [],
    'DD形式': [],
    'EE形式': [],
    '数字のみ': [],
    '★付き': [],
    'その他テキスト': [],
  };

  for (const propertyNumber of allPropertyNumbers) {
    if (propertyNumber.startsWith('AA')) {
      patterns['AA形式'].push(propertyNumber);
    } else if (propertyNumber.startsWith('BB')) {
      patterns['BB形式'].push(propertyNumber);
    } else if (propertyNumber.startsWith('CC')) {
      patterns['CC形式'].push(propertyNumber);
    } else if (propertyNumber.startsWith('DD')) {
      patterns['DD形式'].push(propertyNumber);
    } else if (propertyNumber.startsWith('EE')) {
      patterns['EE形式'].push(propertyNumber);
    } else if (propertyNumber.startsWith('★')) {
      patterns['★付き'].push(propertyNumber);
    } else if (/^\d+$/.test(propertyNumber)) {
      patterns['数字のみ'].push(propertyNumber);
    } else {
      patterns['その他テキスト'].push(propertyNumber);
    }
  }

  // 結果を表示
  console.log('📊 物件番号の形式別集計:\n');
  
  for (const [pattern, numbers] of Object.entries(patterns)) {
    if (numbers.length > 0) {
      console.log(`${pattern}: ${numbers.length}件`);
      
      // 最初の5件を表示
      const samples = numbers.slice(0, 5);
      samples.forEach(num => {
        console.log(`   - ${num}`);
      });
      
      if (numbers.length > 5) {
        console.log(`   ... 他${numbers.length - 5}件`);
      }
      console.log('');
    }
  }

  // 特定の物件番号を検索
  console.log('📊 特定の物件番号を検索:\n');
  
  const searchTargets = ['久原', '東荘園', '藤の台'];
  
  for (const target of searchTargets) {
    const found = allPropertyNumbers.includes(target);
    if (found) {
      console.log(`✅ ${target}: 存在します`);
    } else {
      console.log(`❌ ${target}: 存在しません`);
    }
  }

  console.log('\n✅ 確認完了');
}

main().catch(console.error);
