import * as dotenv from 'dotenv';
dotenv.config({ path: './backend/.env.local' });

async function syncAA13501PropertyAddress() {
  try {
    console.log('=== AA13501 Property Address Sync ===');
    
    // スプレッドシートから物件所在地を取得
    const { GoogleSheetsClient } = await import('./src/services/GoogleSheetsClient');
    
    const sheetsConfig = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };
    
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();
    
    // 全データを取得
    const rows = await sheetsClient.readAll();
    
    // AA13501を探す
    const aa13501Row = rows.find((row: any) => row['売主番号'] === 'AA13501');
    
    if (!aa13501Row) {
      console.error('❌ AA13501 not found in spreadsheet');
      return;
    }
    
    const propertyAddress = aa13501Row['物件所在地'];
    console.log('✅ Property address from spreadsheet:', propertyAddress);
    
    if (!propertyAddress || propertyAddress.trim() === '') {
      console.error('❌ Property address is empty in spreadsheet');
      return;
    }
    
    // データベースを更新
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    // AA13501の売主IDを取得
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id, seller_number')
      .eq('seller_number', 'AA13501')
      .single();
    
    if (sellerError || !seller) {
      console.error('❌ Seller not found:', sellerError);
      return;
    }
    
    console.log('✅ Seller found:', seller);
    
    // propertiesテーブルを更新
    const { data: updatedProperty, error: updateError } = await supabase
      .from('properties')
      .update({
        property_address: propertyAddress,
        updated_at: new Date().toISOString(),
      })
      .eq('seller_id', seller.id)
      .select();
    
    if (updateError) {
      console.error('❌ Update failed:', updateError);
      return;
    }
    
    console.log('✅ Property address updated successfully!');
    console.log('Updated property:', updatedProperty);
    
    // 確認
    const { data: verifyProperty, error: verifyError } = await supabase
      .from('properties')
      .select('*')
      .eq('seller_id', seller.id)
      .single();
    
    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
      return;
    }
    
    console.log('\n=== Verification ===');
    console.log('property_address:', verifyProperty.property_address);
    console.log('✅ Sync completed successfully!');
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
  }
}

syncAA13501PropertyAddress();
