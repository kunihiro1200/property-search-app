/**
 * 重複物件をクリーンアップするスクリプト
 * 各売主に対して最新の物件のみを残し、古い物件を削除
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function getAllData(table: string, select: string): Promise<any[]> {
  const pageSize = 1000;
  let page = 0;
  let allData: any[] = [];
  
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (error) {
      console.error(`${table}取得エラー:`, error.message);
      break;
    }
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    page++;
  }
  
  return allData;
}

async function cleanupDuplicateProperties() {
  console.log('=== 重複物件クリーンアップ ===\n');

  // 1. 全物件を取得
  console.log('📊 全物件を取得中...');
  const properties = await getAllData('properties', 'id, seller_id, address, created_at');
  console.log(`  物件数: ${properties.length}`);

  // 2. 売主ごとに物件をグループ化
  const propertiesBySeller = new Map<string, any[]>();
  properties.forEach(p => {
    const list = propertiesBySeller.get(p.seller_id) || [];
    list.push(p);
    propertiesBySeller.set(p.seller_id, list);
  });

  // 3. 重複を持つ売主を特定
  const sellersWithDuplicates = Array.from(propertiesBySeller.entries())
    .filter(([_, props]) => props.length > 1);
  
  console.log(`\n重複物件を持つ売主: ${sellersWithDuplicates.length}件`);

  if (sellersWithDuplicates.length === 0) {
    console.log('✅ 重複物件はありません');
    return;
  }

  // 4. 削除対象を特定（最新の物件以外を削除）
  const propertiesToDelete: string[] = [];
  
  for (const [, props] of sellersWithDuplicates) {
    // created_atで降順ソート（最新が先頭）
    props.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });
    
    // 最新以外を削除対象に追加
    for (let i = 1; i < props.length; i++) {
      propertiesToDelete.push(props[i].id);
    }
  }

  console.log(`削除対象物件: ${propertiesToDelete.length}件`);

  // 5. 削除実行
  console.log('\n🗑️ 重複物件を削除中...');
  
  const batchSize = 100;
  let deleted = 0;
  let errors = 0;

  for (let i = 0; i < propertiesToDelete.length; i += batchSize) {
    const batch = propertiesToDelete.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('properties')
      .delete()
      .in('id', batch);
    
    if (error) {
      console.log(`  ❌ バッチ削除エラー: ${error.message}`);
      errors += batch.length;
    } else {
      deleted += batch.length;
    }
    
    console.log(`  進捗: ${Math.min(i + batchSize, propertiesToDelete.length)}/${propertiesToDelete.length}`);
  }

  console.log(`\n=== 完了 ===`);
  console.log(`削除成功: ${deleted}件`);
  console.log(`エラー: ${errors}件`);

  // 6. 最終確認
  console.log('\n📊 最終確認...');
  const finalProperties = await getAllData('properties', 'id, seller_id');
  
  const finalPropertiesBySeller = new Map<string, number>();
  finalProperties.forEach(p => {
    finalPropertiesBySeller.set(p.seller_id, (finalPropertiesBySeller.get(p.seller_id) || 0) + 1);
  });
  
  const stillDuplicates = Array.from(finalPropertiesBySeller.entries())
    .filter(([_, count]) => count > 1);
  
  console.log(`  物件数: ${finalProperties.length}`);
  console.log(`  重複物件を持つ売主: ${stillDuplicates.length}件`);
}

cleanupDuplicateProperties().catch(console.error);
