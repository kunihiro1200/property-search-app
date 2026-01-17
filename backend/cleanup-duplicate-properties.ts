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

interface CleanupResult {
  sellerId: string;
  sellerNumber: string;
  totalProperties: number;
  keptProperty: string;
  deletedProperties: string[];
  relocatedValuations: number;
}

async function cleanupDuplicateProperties(dryRun: boolean = true) {
  console.log('=== 重複物件のクリーンアップ ===\n');
  console.log(`モード: ${dryRun ? 'ドライラン（実際には削除しません）' : '本番実行'}\n`);

  const results: CleanupResult[] = [];
  let totalDeleted = 0;
  let totalRelocated = 0;

  try {
    // 1. 重複物件を持つ売主を検索
    console.log('📊 重複物件を持つ売主を検索中...\n');
    
    const { data: sellers, error: sellersError } = await supabase
      .from('sellers')
      .select(`
        id,
        seller_number,
        properties (
          id,
          address,
          land_area,
          building_area,
          created_at
        )
      `);

    if (sellersError) {
      throw new Error(`売主取得エラー: ${sellersError.message}`);
    }

    // 重複を持つ売主をフィルタリング
    const sellersWithDuplicates = sellers?.filter((seller: any) => 
      seller.properties && seller.properties.length > 1
    ) || [];

    console.log(`✅ ${sellersWithDuplicates.length}件の売主が重複物件を持っています\n`);

    if (sellersWithDuplicates.length === 0) {
      console.log('クリーンアップの必要はありません。');
      return;
    }

    // 2. 各売主について処理
    for (const seller of sellersWithDuplicates) {
      const properties = seller.properties as PropertyRecord[];
      
      console.log(`\n処理中: ${seller.seller_number} (${properties.length}件の物件)`);

      // 最も完全なデータを持つ物件を選択
      const bestProperty = selectBestProperty(properties);
      const propertiesToDelete = properties.filter(p => p.id !== bestProperty.id);

      console.log(`  保持: ${bestProperty.id} (住所: ${bestProperty.address || '(空)'}, 作成: ${new Date(bestProperty.created_at).toLocaleString('ja-JP')})`);
      console.log(`  削除予定: ${propertiesToDelete.length}件`);

      if (!dryRun) {
        // 3. valuationsレコードを保持する物件に移動
        let relocatedCount = 0;
        for (const prop of propertiesToDelete) {
          const { data: valuations, error: valuationsError } = await supabase
            .from('valuations')
            .select('id')
            .eq('property_id', prop.id);

          if (valuationsError) {
            console.error(`    ⚠️  査定取得エラー (物件 ${prop.id}): ${valuationsError.message}`);
            continue;
          }

          if (valuations && valuations.length > 0) {
            console.log(`    📦 ${valuations.length}件の査定を移動中...`);
            
            const { error: updateError } = await supabase
              .from('valuations')
              .update({ property_id: bestProperty.id })
              .eq('property_id', prop.id);

            if (updateError) {
              console.error(`    ⚠️  査定移動エラー: ${updateError.message}`);
            } else {
              relocatedCount += valuations.length;
            }
          }
        }

        // 4. 重複物件を削除
        const propertyIds = propertiesToDelete.map(p => p.id);
        const { error: deleteError } = await supabase
          .from('properties')
          .delete()
          .in('id', propertyIds);

        if (deleteError) {
          console.error(`  ❌ 削除エラー: ${deleteError.message}`);
        } else {
          console.log(`  ✅ ${propertyIds.length}件の物件を削除しました`);
          totalDeleted += propertyIds.length;
          totalRelocated += relocatedCount;
        }

        results.push({
          sellerId: seller.id,
          sellerNumber: seller.seller_number,
          totalProperties: properties.length,
          keptProperty: bestProperty.id,
          deletedProperties: propertyIds,
          relocatedValuations: relocatedCount,
        });
      } else {
        // ドライランの場合
        propertiesToDelete.forEach(prop => {
          console.log(`    - ${prop.id} (住所: ${prop.address || '(空)'}, 作成: ${new Date(prop.created_at).toLocaleString('ja-JP')})`);
        });
      }
    }

    // 5. サマリー
    console.log('\n=== クリーンアップ完了 ===\n');
    console.log(`処理した売主: ${sellersWithDuplicates.length}件`);
    
    if (!dryRun) {
      console.log(`削除した物件: ${totalDeleted}件`);
      console.log(`移動した査定: ${totalRelocated}件`);
      console.log('\n詳細結果:');
      results.forEach(r => {
        console.log(`  ${r.sellerNumber}: ${r.totalProperties}件 → 1件 (査定移動: ${r.relocatedValuations}件)`);
      });
    } else {
      console.log('\n⚠️  これはドライランです。実際には何も削除されていません。');
      console.log('本番実行するには、dryRun = false で実行してください。');
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    throw error;
  }
}

/**
 * 最も完全なデータを持つ物件を選択
 * 優先順位:
 * 1. 住所が入っている
 * 2. 面積データが入っている
 * 3. 最新のもの
 */
function selectBestProperty(properties: PropertyRecord[]): PropertyRecord {
  // スコアリング
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
    
    // 新しいほど良い（タイムスタンプを秒に変換して加算）
    const timestamp = new Date(prop.created_at).getTime() / 1000;
    score += timestamp / 1000000; // 小さな値として加算
    
    return { property: prop, score };
  });

  // スコアが最も高いものを選択
  scored.sort((a, b) => b.score - a.score);
  
  return scored[0].property;
}

// コマンドライン引数を確認
const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');

if (!dryRun) {
  console.log('⚠️  警告: 本番実行モードです。データが実際に削除されます。');
  console.log('続行するには Ctrl+C で中断し、確認してください。\n');
  
  // 5秒待機
  setTimeout(() => {
    cleanupDuplicateProperties(false)
      .then(() => {
        console.log('\n✅ クリーンアップ完了');
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ エラー:', error);
        process.exit(1);
      });
  }, 5000);
} else {
  cleanupDuplicateProperties(true)
    .then(() => {
      console.log('\n✅ ドライラン完了');
      console.log('\n本番実行するには: npx ts-node cleanup-duplicate-properties.ts --execute');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ エラー:', error);
      process.exit(1);
    });
}
