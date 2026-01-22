import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncFromSheet() {
  console.log('=== AA6369をスプレッドシートから同期 ===\n');

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
    
    console.log('📋 スプレッドシートのデータ:');
    console.log('  売主番号:', targetRow['売主番号']);
    console.log('  氏名:', targetRow['氏名']);
    console.log('  物件住所:', targetRow['物件住所']);
    console.log('  物件種別:', targetRow['物件種別']);
    console.log('  土地面積:', targetRow['土地面積']);
    console.log('  建物面積:', targetRow['建物面積']);
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

    // 既存の物件データを確認
    const { data: existingProperty } = await supabase
      .from('properties')
      .select('*')
      .eq('seller_id', seller.id)
      .single();

    if (existingProperty) {
      console.log('📝 既存の物件データを更新します...');
      
      // 物件データを更新
      const { error: updateError } = await supabase
        .from('properties')
        .update({
          address: targetRow['物件住所'] || existingProperty.address,
          property_type: targetRow['物件種別'] || existingProperty.property_type,
          land_area: targetRow['土地面積'] !== undefined && targetRow['土地面積'] !== null ? parseFloat(String(targetRow['土地面積'])) : existingProperty.land_area,
          building_area: targetRow['建物面積'] !== undefined && targetRow['建物面積'] !== null ? parseFloat(String(targetRow['建物面積'])) : existingProperty.building_area,
          build_year: targetRow['築年'] !== undefined && targetRow['築年'] !== null ? parseInt(String(targetRow['築年'])) : existingProperty.build_year,
          floor_plan: targetRow['間取り'] || existingProperty.floor_plan,
          structure: targetRow['構造'] || existingProperty.structure,
          seller_situation: targetRow['状況（売主）'] || existingProperty.seller_situation,
        })
        .eq('id', existingProperty.id);

      if (updateError) {
        console.error('❌ 物件データ更新エラー:', updateError);
        return;
      }

      console.log('✅ 物件データを更新しました');
    } else {
      console.log('📝 新規物件データを作成します...');
      
      // 物件データを作成
      const { error: insertError } = await supabase
        .from('properties')
        .insert({
          seller_id: seller.id,
          address: targetRow['物件住所'] || '住所不明',
          prefecture: null,
          city: null,
          property_type: targetRow['物件種別'] || 'detached_house',
          land_area: targetRow['土地面積'] ? parseFloat(String(targetRow['土地面積'])) : null,
          building_area: targetRow['建物面積'] ? parseFloat(String(targetRow['建物面積'])) : null,
          build_year: targetRow['築年'] ? parseInt(String(targetRow['築年'])) : null,
          floor_plan: targetRow['間取り'] || null,
          structure: targetRow['構造'] || null,
          seller_situation: targetRow['状況（売主）'] || null,
        });

      if (insertError) {
        console.error('❌ 物件データ作成エラー:', insertError);
        return;
      }

      console.log('✅ 物件データを作成しました');
    }

    console.log('');
    console.log('🎉 同期完了！通話モードページをリロードしてください。');

  } catch (error) {
    console.error('❌ エラー:', error);
  }

  process.exit(0);
}

syncFromSheet().catch(console.error);
