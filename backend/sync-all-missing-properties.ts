import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncAllMissingProperties() {
  console.log('🎯 物件データが存在しない売主を確認して作成します\n');

  // 1. スプレッドシートからデータを取得
  console.log('📊 ステップ1: スプレッドシートからデータを取得...');
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  });

  await sheetsClient.authenticate();
  const rows = await sheetsClient.readAll();
  console.log(`✅ ${rows.length}行のデータを取得しました\n`);

  // 2. 物件種別と現況のマッピング
  const propertyTypeMap: { [key: string]: string } = {
    '戸': '戸建て',
    '土': '土地',
    'マ': 'マンション',
    '棟': 'アパート一棟',
    '一棟': 'アパート一棟',
    '他': 'その他',
    '事': '事業用',
    '戸建て': '戸建て',
    '土地': '土地',
    'マンション': 'マンション',
    'アパート一棟': 'アパート一棟',
    'その他': 'その他',
    '事業用': '事業用',
  };

  const currentStatusMap: { [key: string]: string } = {
    '居': '居住中',
    '空': '空き家',
    '賃': '賃貸中',
    '古': '古屋あり',
    '更': '更地',
    '居住中': '居住中',
    '空き家': '空き家',
    '賃貸中': '賃貸中',
    '古屋あり': '古屋あり',
    '更地': '更地',
  };

  // 3. 各売主を処理
  let checkedCount = 0;
  let missingCount = 0;
  let createdCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const sellerNumber = row['売主番号'];

    if (!sellerNumber) {
      skippedCount++;
      continue;
    }

    try {
      // 売主を取得
      const { data: seller, error: sellerError } = await supabase
        .from('sellers')
        .select('id')
        .eq('seller_number', sellerNumber)
        .single();

      if (sellerError || !seller) {
        skippedCount++;
        continue;
      }

      checkedCount++;

      // 物件が存在するか確認
      const { data: properties, error: propertyError } = await supabase
        .from('properties')
        .select('id')
        .eq('seller_id', seller.id);

      if (propertyError) {
        console.error(`❌ ${sellerNumber}: 物件確認エラー - ${propertyError.message}`);
        errorCount++;
        continue;
      }

      // 物件が存在する場合はスキップ
      if (properties && properties.length > 0) {
        continue;
      }

      // 物件が存在しない場合は作成
      missingCount++;

      // スプレッドシートから物件情報を取得
      const propertyAddress = row['物件所在地'];
      const propertyTypeRaw = row['種別'];
      const landArea = row['土（㎡）'];
      const buildingArea = row['建（㎡）'];
      const buildYear = row['築年'];
      const currentStatusRaw = row['状況（売主）'];

      // 物件所在地がない場合はスキップ
      if (!propertyAddress) {
        console.log(`⏭️  ${sellerNumber}: 物件所在地がないためスキップ`);
        skippedCount++;
        continue;
      }

      // 物件種別を変換（マッピングにない場合は「その他」にする）
      const propertyType = propertyTypeMap[propertyTypeRaw] || 'その他';
      
      // デバッグ：不明な物件種別をログ出力
      if (propertyTypeRaw && !propertyTypeMap[propertyTypeRaw]) {
        console.log(`⚠️  ${sellerNumber}: 不明な物件種別 "${propertyTypeRaw}" → "その他" に変換`);
      }
      
      // 物件種別が空の場合もデフォルト値を設定
      const finalPropertyType = propertyType || 'その他';

      // 現況を変換
      const currentStatus = currentStatusMap[currentStatusRaw] || null;

      // 物件データを作成
      const propertyData = {
        seller_id: seller.id,
        property_address: propertyAddress,
        property_type: finalPropertyType,
        land_area: landArea ? parseFloat(landArea) : null,
        building_area: buildingArea ? parseFloat(buildingArea) : null,
        construction_year: buildYear ? parseInt(buildYear) : null,
        current_status: currentStatus,
      };

      const { error: createError } = await supabase
        .from('properties')
        .insert(propertyData);

      if (createError) {
        console.error(`❌ ${sellerNumber}: 物件作成エラー - ${createError.message}`);
        errorCount++;
      } else {
        createdCount++;
        if (createdCount % 50 === 0) {
          console.log(`📊 進捗: ${i + 1}/${rows.length} (確認: ${checkedCount}, 不足: ${missingCount}, 作成: ${createdCount}, エラー: ${errorCount})`);
        }
      }
    } catch (error: any) {
      console.error(`❌ ${sellerNumber}: エラー - ${error.message}`);
      errorCount++;
    }
  }

  console.log('\n🎉 同期完了！');
  console.log(`📊 結果:`);
  console.log(`   🔍 確認した売主: ${checkedCount}件`);
  console.log(`   ⚠️  物件データ不足: ${missingCount}件`);
  console.log(`   ✅ 作成成功: ${createdCount}件`);
  console.log(`   ⏭️  スキップ: ${skippedCount}件`);
  console.log(`   ❌ エラー: ${errorCount}件`);
  console.log('');
  console.log('次のステップ:');
  console.log('1. ブラウザで売主リストページをリロード（F5）');
  console.log('2. 複数の売主の詳細画面を開いて、物件情報が表示されているか確認');
}

syncAllMissingProperties()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
