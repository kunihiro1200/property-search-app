import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function addFloorPlanToAA12903() {
  try {
    console.log('🔍 AA12903の間取りデータを追加します...\n');

    // スプレッドシートからデータを取得
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME!,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH!,
    });
    
    await sheetsClient.authenticate();
    const rows = await sheetsClient.readAll();
    const aa12903Row = rows.find((row: any) => row['売主番号'] === 'AA12903');
    
    if (!aa12903Row) {
      console.error('❌ スプレッドシートにAA12903が見つかりません');
      return;
    }
    
    const floorPlan = aa12903Row['間取り'] || null;
    console.log('📊 スプレッドシートから取得した間取り:', floorPlan || '(空)');
    
    // 売主IDを取得
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id')
      .eq('seller_number', 'AA12903')
      .single();
    
    if (sellerError || !seller) {
      console.error('❌ データベースにAA12903が見つかりません:', sellerError);
      return;
    }
    
    // 物件情報を更新
    if (floorPlan) {
      console.log('\n📝 データベースを更新します...');
      
      const { error: propertyError } = await supabase
        .from('properties')
        .update({ floor_plan: floorPlan })
        .eq('seller_id', seller.id);
      
      if (propertyError) {
        console.error('❌ 物件情報の更新に失敗:', propertyError);
      } else {
        console.log('✅ 間取りを更新:', floorPlan);
      }
    }
    
    // 更新後のデータを確認
    console.log('\n🔍 更新後のデータを確認...');
    const { data: updatedProperty } = await supabase
      .from('properties')
      .select('land_area, building_area, floor_plan')
      .eq('seller_id', seller.id)
      .single();
    
    console.log('\n✅ 更新完了:');
    console.log('土地面積:', updatedProperty?.land_area || '(空)');
    console.log('建物面積:', updatedProperty?.building_area || '(空)');
    console.log('間取り:', updatedProperty?.floor_plan || '(空)');
    
  } catch (err) {
    console.error('❌ エラー:', err);
  }
}

addFloorPlanToAA12903();
