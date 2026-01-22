import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';
import { encrypt } from './src/utils/encryption';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncAA12903() {
  console.log('=== AA12903をスプレッドシートから同期 ===\n');

  // スプレッドシートクライアントを初期化
  const sheetsConfig = {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  };
  
  const sheetsClient = new GoogleSheetsClient(sheetsConfig);
  await sheetsClient.authenticate();

  // スプレッドシートからAA12903を検索
  const allRows = await sheetsClient.readAll();
  console.log(`スプレッドシートから${allRows.length}行を取得`);

  const aa12903Row = allRows.find((row: any) => row['売主番号'] === 'AA12903');
  
  if (!aa12903Row) {
    console.log('❌ スプレッドシートにAA12903が見つかりません');
    return;
  }

  console.log('✅ スプレッドシートでAA12903を発見\n');
  console.log('スプレッドシートのデータ:');
  console.log('全カラム:', Object.keys(aa12903Row));
  console.log('売主番号:', aa12903Row['売主番号']);
  console.log('氏名:', aa12903Row['氏名']);
  console.log('住所:', aa12903Row['住所']);
  console.log('電話番号:', aa12903Row['電話番号']);
  console.log('');

  // カラムマッパーでデータを変換
  const columnMapper = new ColumnMapper();
  const dbData = columnMapper.mapToDatabase(aa12903Row);

  console.log('変換後のデータベース形式:');
  console.log('name:', dbData.name);
  console.log('address:', dbData.address);
  console.log('phone_number:', dbData.phone_number);
  console.log('');

  // データベースのAA12903を取得
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('*')
    .ilike('seller_number', '%12903%')
    .single();

  if (sellerError || !seller) {
    console.log('❌ データベースにAA12903が見つかりません');
    return;
  }

  console.log('データベースを更新中...');

  // 売主情報を更新
  const { error: updateError } = await supabase
    .from('sellers')
    .update({
      name: encrypt(dbData.name || '不明'),
      address: encrypt(dbData.address || ''),
      phone_number: encrypt(dbData.phone_number || ''),
    })
    .eq('id', seller.id);

  if (updateError) {
    console.error('❌ 売主情報の更新エラー:', updateError);
    return;
  }

  console.log('✅ 売主情報を更新しました');

  // 物件情報を確認
  const { data: existingProperty } = await supabase
    .from('properties')
    .select('*')
    .eq('seller_id', seller.id)
    .single();

  if (existingProperty) {
    // 物件情報を更新
    const { error: propUpdateError } = await supabase
      .from('properties')
      .update({
        address: aa12903Row['物件住所'] || '',
        property_type: aa12903Row['物件種別'] || null,
        land_area: aa12903Row['土地面積'] ? parseFloat(String(aa12903Row['土地面積']).replace(/,/g, '')) : null,
        building_area: aa12903Row['建物面積'] ? parseFloat(String(aa12903Row['建物面積']).replace(/,/g, '')) : null,
        build_year: aa12903Row['築年'] ? parseInt(String(aa12903Row['築年']), 10) : null,
        structure: aa12903Row['構造'] || null,
        seller_situation: aa12903Row['状況（売主）'] || null,
      })
      .eq('id', existingProperty.id);

    if (propUpdateError) {
      console.error('❌ 物件情報の更新エラー:', propUpdateError);
    } else {
      console.log('✅ 物件情報を更新しました');
    }
  } else {
    // 物件情報を新規作成
    const { error: propInsertError } = await supabase
      .from('properties')
      .insert({
        seller_id: seller.id,
        address: aa12903Row['物件住所'] || '',
        property_type: aa12903Row['物件種別'] || null,
        land_area: aa12903Row['土地面積'] ? parseFloat(String(aa12903Row['土地面積']).replace(/,/g, '')) : null,
        building_area: aa12903Row['建物面積'] ? parseFloat(String(aa12903Row['建物面積']).replace(/,/g, '')) : null,
        build_year: aa12903Row['築年'] ? parseInt(String(aa12903Row['築年']), 10) : null,
        structure: aa12903Row['構造'] || null,
        seller_situation: aa12903Row['状況（売主）'] || null,
      });

    if (propInsertError) {
      console.error('❌ 物件情報の作成エラー:', propInsertError);
    } else {
      console.log('✅ 物件情報を作成しました');
    }
  }
}

syncAA12903()
  .then(() => {
    console.log('\n✅ 同期完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
