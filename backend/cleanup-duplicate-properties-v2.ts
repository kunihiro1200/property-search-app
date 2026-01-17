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

async function cleanupDuplicatePropertiesV2(dryRun: boolean = true) {
  console.log('=== 重複物件のクリーンアップ V2 ===\n');
  console.log(`モード: ${dryRun ? 'ドライラン（実際には削除しません）' : '本番実行'}\n`);

  let totalDeleted = 0;
  let processedSellers = 0;

  try {
    // 1. 重複を持つseller_idを直接クエリ
    console.log('📊 重複物件を持つ売主を検索中...\n');
    
    const { error: duplicatesError } = await supabase
      .rpc('find_sellers_with_duplicate_properties');

    if (duplicatesError) {
      // RPCが存在しない場合は、直接SQLで取得
      console.log('RPCが見つかりません。直接クエリを実行します...\n');
      
      const { data: allProperties, error: propsError } = await supabase
        .from('properties')
        .select('seller_id, id, address, land_area, building_area, created_at')
        .order('seller_id')
        .order('created_at', { ascending: false });

      if (propsError) {
        throw new Error(`物件取得エラー: ${propsError.message}`);
      }

      // seller_idでグループ化
      const sellerGroups = new Map<string, PropertyRecord[]>();
      
      for (const prop of allProperties || []) {
        if (!sellerGroups.has(prop.seller_id)) {
          sellerGroups.set(prop.seller_id, []);
        }
        sellerGroups.get(prop.seller_id)!.push(prop as PropertyRecord);
      }

      // 重複を持つ売主のみフィルタ
      const sellersWithDuplicates = Array.from(sellerGroups.entries())
        .filter(([_, props]) => props.length > 1);

      console.log(`✅ ${sellersWithDuplicates.length}件の売主が重複物件を持っています\n`);

      if (sellersWithDuplicates.length === 0) {
        console.log('クリーンアップの必要はありません。');
        return;
      }

      // 2. 各売主について処理
      for (const [sellerId, properties] of sellersWithDuplicates) {
        // 売主番号を取得
        const { data: seller } = await supabase
          .from('sellers')
          .select('seller_number')
          .eq('id', sellerId)
          .single();

        const sellerNumber = seller?.seller_number || sellerId;
        
        console.log(`\n処理中: ${sellerNumber} (${properties.length}件の物件)`);

        // 最も完全なデータを持つ物件を選択
        const bestProperty = selectBestProperty(properties);
        const propertiesToDelete = properties.filter(p => p.id !== bestProperty.id);

        console.log(`  保持: ${bestProperty.id} (住所: ${bestProperty.address || '(空)'}, 作成: ${new Date(bestProperty.created_at).toLocaleString('ja-JP')})`);
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
        } else {
          // ドライランの場合
          propertiesToDelete.forEach(prop => {
            console.log(`    - ${prop.id} (住所: ${prop.address || '(空)'}, 作成: ${new Date(prop.created_at).toLocaleString('ja-JP')})`);
          });
        }
      }

      // 3. サマリー
      console.log('\n=== クリーンアップ完了 ===\n');
      console.log(`処理した売主: ${sellersWithDuplicates.length}件`);
      
      if (!dryRun) {
        console.log(`削除した物件: ${totalDeleted}件`);
      } else {
        console.log('\n⚠️  これはドライランです。実際には何も削除されていません。');
        console.log('本番実行するには、dryRun = false で実行してください。');
      }
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
    cleanupDuplicatePropertiesV2(false)
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
  cleanupDuplicatePropertiesV2(true)
    .then(() => {
      console.log('\n✅ ドライラン完了');
      console.log('\n本番実行するには: npx ts-node cleanup-duplicate-properties-v2.ts --execute');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ エラー:', error);
      process.exit(1);
    });
}
