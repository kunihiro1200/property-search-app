import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface PropertyRecord {
  id: string;
  seller_id: string;
  address: string | null;
  land_area: number | null;
  building_area: number | null;
  created_at: string;
}

async function cleanupAllDuplicates(dryRun: boolean = true) {
  console.log('=== 全重複物件のクリーンアップ ===\n');
  console.log(`モード: ${dryRun ? 'ドライラン' : '本番実行'}\n`);

  let totalDeleted = 0;
  let processedSellers = 0;

  try {
    // 全ての物件を取得（ページネーション）
    console.log('📊 全ての物件を取得中...\n');
    
    let allProperties: PropertyRecord[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('properties')
        .select('id, seller_id, address, land_area, building_area, created_at')
        .range(page * pageSize, (page + 1) * pageSize - 1)
        .order('seller_id')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`物件取得エラー: ${error.message}`);
      }

      if (data && data.length > 0) {
        allProperties = allProperties.concat(data as PropertyRecord[]);
        console.log(`  取得済み: ${allProperties.length}件`);
        page++;
        hasMore = data.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    console.log(`\n✅ 合計 ${allProperties.length}件の物件を取得しました\n`);

    // seller_idでグループ化
    const sellerGroups = new Map<string, PropertyRecord[]>();
    
    for (const prop of allProperties) {
      if (!sellerGroups.has(prop.seller_id)) {
        sellerGroups.set(prop.seller_id, []);
      }
      sellerGroups.get(prop.seller_id)!.push(prop);
    }

    // 重複を持つ売主のみフィルタ
    const sellersWithDuplicates = Array.from(sellerGroups.entries())
      .filter(([_, props]) => props.length > 1);

    console.log(`✅ ${sellersWithDuplicates.length}件の売主が重複物件を持っています\n`);

    if (sellersWithDuplicates.length === 0) {
      console.log('クリーンアップの必要はありません。');
      return;
    }

    // 各売主について処理
    for (const [sellerId, properties] of sellersWithDuplicates) {
      // 売主番号を取得
      const { data: seller } = await supabase
        .from('sellers')
        .select('seller_number')
        .eq('id', sellerId)
        .single();

      const sellerNumber = seller?.seller_number || sellerId.substring(0, 8);
      
      console.log(`\n処理中: ${sellerNumber} (${properties.length}件の物件)`);

      // 最も完全なデータを持つ物件を選択
      const bestProperty = selectBestProperty(properties);
      const propertiesToDelete = properties.filter(p => p.id !== bestProperty.id);

      console.log(`  保持: ${bestProperty.id.substring(0, 8)}... (住所: ${bestProperty.address || '(空)'})`);
      console.log(`  削除予定: ${propertiesToDelete.length}件`);

      if (!dryRun) {
        // 重複物件を削除
        const propertyIds = propertiesToDelete.map(p => p.id);
        
        if (propertyIds.length > 0) {
          const { error: deleteError } = await supabase
            .from('properties')
            .delete()
            .in('id', propertyIds);

          if (deleteError) {
            console.error(`  ❌ 削除エラー: ${deleteError.message}`);
          } else {
            console.log(`  ✅ ${propertyIds.length}件の物件を削除しました`);
            totalDeleted += propertyIds.length;
            processedSellers++;
          }
        }
      }
    }

    // サマリー
    console.log('\n=== クリーンアップ完了 ===\n');
    console.log(`重複を持つ売主: ${sellersWithDuplicates.length}件`);
    
    if (!dryRun) {
      console.log(`削除した物件: ${totalDeleted}件`);
      console.log(`処理した売主: ${processedSellers}件`);
    } else {
      const totalToDelete = sellersWithDuplicates.reduce((sum, [_, props]) => sum + props.length - 1, 0);
      console.log(`削除予定の物件: ${totalToDelete}件`);
      console.log('\n⚠️  これはドライランです。実際には何も削除されていません。');
      console.log('本番実行するには: npx ts-node cleanup-all-duplicates-final.ts --execute');
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    throw error;
  }
}

function selectBestProperty(properties: PropertyRecord[]): PropertyRecord {
  const scored = properties.map(prop => {
    let score = 0;
    
    // 住所がある（最重要）
    if (prop.address && prop.address !== '住所不明' && prop.address.trim() !== '') {
      score += 100;
    }
    
    // 土地面積がある
    if (prop.land_area && prop.land_area > 0) {
      score += 10;
    }
    
    // 建物面積がある
    if (prop.building_area && prop.building_area > 0) {
      score += 10;
    }
    
    // 新しいほど良い
    const timestamp = new Date(prop.created_at).getTime() / 1000;
    score += timestamp / 1000000;
    
    return { property: prop, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].property;
}

// 実行
const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');

if (!dryRun) {
  console.log('⚠️  警告: 本番実行モードです。\n');
  setTimeout(() => {
    cleanupAllDuplicates(false)
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  }, 3000);
} else {
  cleanupAllDuplicates(true)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
