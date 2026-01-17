import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function fixAA12903MissingFields() {
  try {
    console.log('🔍 AA12903の不足データを修正します...\n');

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
    
    console.log('📊 スプレッドシートから取得したデータ:');
    console.log('サイト:', aa12903Row['サイト'] || '(空)');
    console.log('土地:', aa12903Row['土（㎡）'] || '(空)');
    console.log('建物:', aa12903Row['建（㎡）'] || '(空)');
    
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
    
    console.log('\n📝 データベースを更新します...');
    
    // サイトフィールドを更新
    const site = aa12903Row['サイト'] || null;
    if (site) {
      const { error: siteError } = await supabase
        .from('sellers')
        .update({ site })
        .eq('id', seller.id);
      
      if (siteError) {
        console.error('❌ サイトの更新に失敗:', siteError);
      } else {
        console.log('✅ サイトを更新:', site);
      }
    }
    
    // 物件情報を更新
    const landArea = aa12903Row['土（㎡）'] ? parseFloat(String(aa12903Row['土（㎡）'])) : null;
    const buildingArea = aa12903Row['建（㎡）'] ? parseFloat(String(aa12903Row['建（㎡）'])) : null;
    
    if (landArea !== null || buildingArea !== null) {
      const updates: any = {};
      if (landArea !== null) updates.land_area = landArea;
      if (buildingArea !== null) updates.building_area = buildingArea;
      
      const { error: propertyError } = await supabase
        .from('properties')
        .update(updates)
        .eq('seller_id', seller.id);
      
      if (propertyError) {
        console.error('❌ 物件情報の更新に失敗:', propertyError);
      } else {
        console.log('✅ 物件情報を更新:');
        if (landArea !== null) console.log('  - 土地面積:', landArea, '㎡');
        if (buildingArea !== null) console.log('  - 建物面積:', buildingArea, '㎡');
      }
    }
    
    // 更新後のデータを確認
    console.log('\n🔍 更新後のデータを確認...');
    const { data: updatedSeller } = await supabase
      .from('sellers')
      .select('seller_number, site')
      .eq('id', seller.id)
      .single();
    
    const { data: updatedProperty } = await supabase
      .from('properties')
      .select('land_area, building_area')
      .eq('seller_id', seller.id)
      .single();
    
    console.log('\n✅ 更新完了:');
    console.log('サイト:', updatedSeller?.site || '(空)');
    console.log('土地面積:', updatedProperty?.land_area || '(空)');
    console.log('建物面積:', updatedProperty?.building_area || '(空)');
    
  } catch (err) {
    console.error('❌ エラー:', err);
  }
}

fixAA12903MissingFields();
