import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixProperty() {
  console.log('=== AA6369の物件データを修正 ===\n');

  try {
    // GoogleSheetsClientを初期化
    const sheetsConfig = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };
    
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();

    // スプレッドシートからAA6369を検索
    console.log('📊 スプレッドシートからデータ取得中...');
    const allRows = await sheetsClient.readAll();
    
    console.log(`✅ ${allRows.length}行取得しました`);
    
    // AA6369を検索
    const targetRow = allRows.find((row: any) => row['売主番号'] === 'AA6369');

    if (!targetRow) {
      console.error('❌ スプレッドシートにAA6369が見つかりません');
      return;
    }

    console.log('✅ スプレッドシートでAA6369を発見\n');
    
    console.log('📋 スプレッドシートのデータ（正しい列名）:');
    console.log('  売主番号:', targetRow['売主番号']);
    console.log('  名前:', targetRow['名前(漢字のみ）']);
    console.log('  物件所在地:', targetRow['物件所在地']);
    console.log('  種別:', targetRow['種別']);
    console.log('  土（㎡）:', targetRow['土（㎡）']);
    console.log('  建（㎡）:', targetRow['建（㎡）']);
    console.log('  築年:', targetRow['築年']);
    console.log('  間取り:', targetRow['間取り']);
    console.log('  構造:', targetRow['構造']);
    console.log('  状況（売主）:', targetRow['状況（売主）']);
    console.log('');

    // 売主IDを取得
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id')
      .eq('seller_number', 'AA6369')
      .single();

    if (sellerError || !seller) {
      console.error('❌ データベースに売主が見つかりません:', sellerError);
      return;
    }

    console.log('✅ データベースで売主を確認: ID =', seller.id);
    console.log('');

    // 既存の物件データを取得
    const { data: existingProperty } = await supabase
      .from('properties')
      .select('*')
      .eq('seller_id', seller.id)
      .single();

    if (!existingProperty) {
      console.error('❌ 物件データが見つかりません');
      return;
    }

    console.log('📝 物件データを更新します...');
    
    // 物件種別のマッピング
    const propertyTypeMap: Record<string, string> = {
      '戸建て': 'detached_house',
      'マンション': 'apartment',
      '土地': 'land',
      '商業用': 'commercial',
    };

    const propertyType = targetRow['種別'] ? propertyTypeMap[targetRow['種別']] || 'detached_house' : 'detached_house';
    
    // 物件データを更新
    const { error: updateError } = await supabase
      .from('properties')
      .update({
        address: targetRow['物件所在地'] || '住所不明',
        property_type: propertyType,
        land_area: targetRow['土（㎡）'] ? parseFloat(String(targetRow['土（㎡）'])) : null,
        building_area: targetRow['建（㎡）'] ? parseFloat(String(targetRow['建（㎡）'])) : null,
        build_year: targetRow['築年'] ? parseInt(String(targetRow['築年'])) : null,
        floor_plan: targetRow['間取り'] || null,
        structure: targetRow['構造'] || null,
        seller_situation: targetRow['状況（売主）'] || null,
      })
      .eq('id', existingProperty.id);

    if (updateError) {
      console.error('❌ 物件データ更新エラー:', updateError);
      return;
    }

    console.log('✅ 物件データを更新しました');
    console.log('');
    console.log('🎉 修正完了！通話モードページをリロードしてください。');

  } catch (error) {
    console.error('❌ エラー:', error);
  }

  process.exit(0);
}

fixProperty().catch(console.error);
