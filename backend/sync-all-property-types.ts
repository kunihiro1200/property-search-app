import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncAllPropertyTypes(dryRun: boolean = true) {
  console.log('=== 全物件種別の一括同期 ===\n');
  console.log(`モード: ${dryRun ? 'ドライラン（確認のみ）' : '本番実行'}\n`);

  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  try {
    // 1. スプレッドシートから全データを取得
    console.log('📊 スプレッドシートからデータを取得中...\n');

    const sheetsConfig = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME!,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    };

    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();

    const rows = await sheetsClient.readAll();
    console.log(`✅ ${rows.length}行のデータを取得しました\n`);

    // 2. データベースから全物件を取得
    console.log('📦 データベースから物件データを取得中...\n');

    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select(`
        *,
        sellers!inner(seller_number)
      `)
      .order('created_at', { ascending: false });

    if (propError) {
      console.error('❌ 物件取得エラー:', propError.message);
      return;
    }

    console.log(`✅ ${properties?.length || 0}件の物件を取得しました\n`);

    // 3. ColumnMapperを初期化
    const columnMapper = new ColumnMapper();

    // 4. 各物件を更新
    console.log('🔄 物件データを更新中...\n');

    for (const property of properties || []) {
      const sellerNumber = (property.sellers as any).seller_number;
      const sheetRow = rows.find((row: any) => row['売主番号'] === sellerNumber);

      if (!sheetRow) {
        totalSkipped++;
        continue;
      }

      // スプレッドシートから期待される値を抽出
      const expectedData = columnMapper.extractPropertyData(sheetRow, property.seller_id);

      if (!expectedData || !expectedData.property_type) {
        totalSkipped++;
        continue;
      }

      // property_typeが異なる場合のみ更新
      if (property.property_type !== expectedData.property_type) {
        if (!dryRun) {
          const { error: updateError } = await supabase
            .from('properties')
            .update({
              property_type: expectedData.property_type,
              land_area: expectedData.land_area,
              building_area: expectedData.building_area,
              build_year: expectedData.build_year,
              structure: expectedData.structure,
              seller_situation: expectedData.seller_situation,
              floor_plan: expectedData.floor_plan,
              land_rights: expectedData.land_rights,
              current_status: expectedData.current_status,
            })
            .eq('id', property.id);

          if (updateError) {
            console.error(`❌ ${sellerNumber}: 更新エラー - ${updateError.message}`);
            totalErrors++;
            continue;
          }
        }

        if (totalUpdated < 10 || !dryRun) {
          console.log(`${dryRun ? '📝' : '✅'} ${sellerNumber}: ${property.property_type || '(空)'} → ${expectedData.property_type}`);
        }

        totalUpdated++;

        // 進捗表示
        if (totalUpdated % 100 === 0) {
          console.log(`  進捗: ${totalUpdated}件更新済み...`);
        }
      } else {
        totalSkipped++;
      }
    }

    // 5. 結果を表示
    console.log('\n=== 同期結果 ===\n');
    console.log(`更新${dryRun ? '予定' : '完了'}: ${totalUpdated}件`);
    console.log(`スキップ: ${totalSkipped}件`);
    if (totalErrors > 0) {
      console.log(`エラー: ${totalErrors}件`);
    }

    if (dryRun) {
      console.log('\n⚠️  これはドライランです。実際には何も更新されていません。');
      console.log('本番実行するには: npx ts-node sync-all-property-types.ts --execute');
    } else {
      console.log('\n✅ 全ての物件データを更新しました！');
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    throw error;
  }
}

// 実行
const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');

if (!dryRun) {
  console.log('⚠️  警告: 本番実行モードです。3秒後に開始します...\n');
  setTimeout(() => {
    syncAllPropertyTypes(false)
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  }, 3000);
} else {
  syncAllPropertyTypes(true)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
