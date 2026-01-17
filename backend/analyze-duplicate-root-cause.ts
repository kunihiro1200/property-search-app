import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeRootCause() {
  console.log('=== 重複物件と住所問題の根本原因分析 ===\n');

  // 1. 重複物件を持つ売主を検索
  const { data: duplicates, error } = await supabase
    .from('sellers')
    .select(`
      id,
      seller_number,
      name,
      properties (
        id,
        address,
        land_area,
        building_area,
        created_at
      )
    `);

  if (error) {
    console.error('エラー:', error);
    return;
  }

  // 重複を持つ売主をフィルタリング
  const sellersWithDuplicates = duplicates?.filter((seller: any) => 
    seller.properties && seller.properties.length > 1
  ) || [];

  console.log(`📊 重複物件を持つ売主: ${sellersWithDuplicates.length}件\n`);

  // サンプルを表示
  const samples = sellersWithDuplicates.slice(0, 5);
  
  for (const seller of samples) {
    console.log(`売主番号: ${seller.seller_number}`);
    console.log(`物件数: ${seller.properties.length}件`);
    
    // 物件の作成日時を確認
    const sortedProperties = seller.properties.sort((a: any, b: any) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    sortedProperties.forEach((prop: any, index: number) => {
      console.log(`  物件${index + 1}:`);
      console.log(`    ID: ${prop.id}`);
      console.log(`    住所: ${prop.address || '(空)'}`);
      console.log(`    土地面積: ${prop.land_area || '(空)'}`);
      console.log(`    建物面積: ${prop.building_area || '(空)'}`);
      console.log(`    作成日時: ${new Date(prop.created_at).toLocaleString('ja-JP')}`);
    });
    console.log();
  }

  console.log('\n=== 根本原因の分析 ===\n');
  
  console.log('🔍 問題1: 重複物件の発生原因');
  console.log('');
  console.log('PropertySyncHandler.findOrCreateProperty()の問題:');
  console.log('  - maybeSingle()を使用しているため、複数の物件が存在する場合にエラーにならない');
  console.log('  - 既存物件が見つからない場合、新しい物件を作成してしまう');
  console.log('  - 同期処理が複数回実行されると、物件が重複して作成される');
  console.log('');
  console.log('コード例:');
  console.log('  const { data: existing } = await supabase');
  console.log('    .from("properties")');
  console.log('    .select("id")');
  console.log('    .eq("seller_id", sellerId)');
  console.log('    .maybeSingle();  // ← 複数存在しても最初の1件だけ返す');
  console.log('');
  console.log('  if (!existing) {');
  console.log('    // 新規作成 ← 既に複数存在する場合でも作成してしまう');
  console.log('  }');
  console.log('');

  console.log('🔍 問題2: 物件住所が売主住所になる原因');
  console.log('');
  console.log('ColumnMapper.extractPropertyData()の問題:');
  console.log('  - スプレッドシートの「物件所在地」列が空の場合、nullを返す');
  console.log('  - しかし、MigrationServiceやfix-call-mode-dataスクリプトでは、');
  console.log('    nullが返された場合でも物件を作成しようとする');
  console.log('  - その結果、住所が空の物件レコードが作成される');
  console.log('');
  console.log('さらに、一部のスクリプトでは:');
  console.log('  - 物件住所が空の場合、売主住所をフォールバックとして使用している');
  console.log('  - これにより、物件住所 = 売主住所 となってしまう');
  console.log('');

  console.log('🔍 問題3: 面積データが空になる原因');
  console.log('');
  console.log('スプレッドシートのデータ品質の問題:');
  console.log('  - スプレッドシートの「土（㎡）」「建（㎡）」列が空の場合');
  console.log('  - extractPropertyData()はundefinedを返す');
  console.log('  - データベースにはnullとして保存される');
  console.log('');

  console.log('\n=== 解決策 ===\n');
  
  console.log('✅ 解決策1: 重複物件の防止');
  console.log('  1. PropertySyncHandlerを修正:');
  console.log('     - maybeSingle()の代わりに、複数件チェックを追加');
  console.log('     - 複数物件が存在する場合は、最新のものを使用するか、エラーを返す');
  console.log('  2. 一意制約を追加:');
  console.log('     - properties テーブルに seller_id の UNIQUE 制約を追加');
  console.log('     - または、seller_id + address の複合ユニーク制約');
  console.log('');

  console.log('✅ 解決策2: 物件住所の正確なマッピング');
  console.log('  1. extractPropertyData()を修正:');
  console.log('     - 物件住所が空の場合は、物件データ自体を作成しない');
  console.log('  2. 同期スクリプトを修正:');
  console.log('     - 売主住所をフォールバックとして使用しない');
  console.log('     - スプレッドシートのデータ品質を確認するログを追加');
  console.log('');

  console.log('✅ 解決策3: 既存の重複データのクリーンアップ');
  console.log('  1. 重複物件を特定');
  console.log('  2. 最新または最も完全なデータを持つ物件を保持');
  console.log('  3. 他の重複物件を削除');
  console.log('  4. 関連する valuations レコードを更新');
  console.log('');

  console.log('✅ 解決策4: データ品質の向上');
  console.log('  1. スプレッドシートのバリデーションを強化');
  console.log('  2. 物件住所が必須の場合は、空のまま同期しない');
  console.log('  3. 同期前にデータ品質チェックを実行');
  console.log('');
}

analyzeRootCause()
  .then(() => {
    console.log('\n✅ 分析完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
