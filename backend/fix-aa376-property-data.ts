/**
 * AA376の物件データを修正するスクリプト
 */

import { google } from 'googleapis';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '.env') });

const SPREADSHEET_ID = '1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function fixAA376PropertyData() {
  // Google Sheets認証
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'google-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // ヘッダー行を取得
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: '売主リスト!A1:CZ1',
  });
  const headers = headerResponse.data.values?.[0] || [];

  // データを取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: '売主リスト!B:CZ',
  });
  const rows = dataResponse.data.values || [];

  // AA376を探す
  const aa376Row = rows.find(row => row[0] === 'AA376');
  if (!aa376Row) {
    console.log('AA376が見つかりません');
    return;
  }

  // ヘッダーからインデックスを取得する関数
  const getIndex = (headerName: string): number => {
    const index = headers.findIndex(h => h === headerName);
    return index >= 0 ? index - 1 : -1; // B列起点なので-1
  };

  // 物件データを抽出
  const propertyAddress = aa376Row[getIndex('物件所在地')] || null;
  const propertyType = aa376Row[getIndex('種別')] || null;
  const landArea = aa376Row[getIndex('土（㎡）')] || null;
  const buildingArea = aa376Row[getIndex('建（㎡）')] || null;
  const buildYear = aa376Row[getIndex('築年')] || null;
  const structure = aa376Row[getIndex('構造')] || null;
  const floorPlan = aa376Row[getIndex('間取り')] || null;

  console.log('=== 抽出したデータ ===');
  console.log('物件所在地:', propertyAddress);
  console.log('種別:', propertyType);
  console.log('土地面積:', landArea);
  console.log('建物面積:', buildingArea);
  console.log('築年:', buildYear);
  console.log('構造:', structure);
  console.log('間取り:', floorPlan);

  // sellersテーブルを更新
  console.log('\n=== sellersテーブルを更新 ===');
  const updateData: Record<string, any> = {};
  
  if (propertyAddress) updateData.property_address = propertyAddress;
  if (propertyType) updateData.property_type = propertyType;
  if (landArea) updateData.land_area = parseFloat(landArea);
  if (buildingArea) updateData.building_area = parseFloat(buildingArea);
  if (buildYear) updateData.build_year = parseInt(buildYear);
  if (structure) updateData.structure = structure;
  if (floorPlan) updateData.floor_plan = floorPlan;

  console.log('更新データ:', updateData);

  const { error: updateError } = await supabase
    .from('sellers')
    .update(updateData)
    .eq('seller_number', 'AA376');

  if (updateError) {
    console.log('更新エラー:', updateError.message);
    return;
  }

  console.log('✅ sellersテーブルを更新しました');

  // 更新後のデータを確認
  const { data: updatedSeller, error: selectError } = await supabase
    .from('sellers')
    .select('seller_number, property_address, property_type, land_area, building_area, build_year, structure, floor_plan')
    .eq('seller_number', 'AA376')
    .single();

  if (selectError) {
    console.log('確認エラー:', selectError.message);
    return;
  }

  console.log('\n=== 更新後のデータ ===');
  console.log('売主番号:', updatedSeller.seller_number);
  console.log('物件所在地:', updatedSeller.property_address);
  console.log('種別:', updatedSeller.property_type);
  console.log('土地面積:', updatedSeller.land_area);
  console.log('建物面積:', updatedSeller.building_area);
  console.log('築年:', updatedSeller.build_year);
  console.log('構造:', updatedSeller.structure);
  console.log('間取り:', updatedSeller.floor_plan);
}

fixAA376PropertyData().catch(console.error);
