// AA10424を property_listings テーブルに追加するスクリプト
import dotenv from 'dotenv';
import { GoogleSheetsClient } from '../src/services/GoogleSheetsClient';
import { PropertyListingColumnMapper } from '../src/services/PropertyListingColumnMapper';
import { createClient } from '@supabase/supabase-js';

// 環境変数を読み込み
dotenv.config();

async function addAA10424ToPropertyListings() {
  console.log('🔄 Adding AA10424 to property_listings table...\n');

  try {
    // 1. Supabaseクライアントを初期化
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // 2. GoogleSheetsClientを初期化して認証
    const sheetsConfig = {
      spreadsheetId: '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY',
      sheetName: '物件',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH!
    };
    
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();
    
    // 3. スプレッドシートから全データを読み込み
    console.log('📊 Reading spreadsheet data...');
    const spreadsheetData = await sheetsClient.readAll();
    
    // 4. AA10424を検索
    const aa10424Row = spreadsheetData.find(row => {
      const propertyNumber = String(row['物件番号'] || '').trim();
      return propertyNumber === 'AA10424';
    });

    if (!aa10424Row) {
      console.error('❌ AA10424 not found in spreadsheet');
      process.exit(1);
    }

    console.log('✅ AA10424 found in spreadsheet');
    
    // 5. Google Map URLを確認
    const googleMapUrl = aa10424Row['GoogleMap'];
    console.log(`📍 Google Map URL: ${googleMapUrl || '(empty)'}`);

    // 6. データベースにAA10424が既に存在するか確認
    const { data: existing, error: checkError } = await supabase
      .from('property_listings')
      .select('property_number')
      .eq('property_number', 'AA10424')
      .single();

    if (existing) {
      console.log('⚠️ AA10424 already exists in database');
      console.log('Updating instead...');
      
      // 更新
      const mapper = new PropertyListingColumnMapper();
      const mappedData = mapper.mapSpreadsheetToDatabase(aa10424Row);
      
      const { error: updateError } = await supabase
        .from('property_listings')
        .update({
          ...mappedData,
          updated_at: new Date().toISOString()
        })
        .eq('property_number', 'AA10424');

      if (updateError) {
        console.error('❌ Failed to update AA10424:', updateError.message);
        process.exit(1);
      }

      console.log('✅ AA10424 updated successfully!');
    } else {
      // 新規追加
      const mapper = new PropertyListingColumnMapper();
      const mappedData = mapper.mapSpreadsheetToDatabase(aa10424Row);
      
      // タイムスタンプを追加
      mappedData.created_at = new Date().toISOString();
      mappedData.updated_at = new Date().toISOString();

      const { error: insertError } = await supabase
        .from('property_listings')
        .insert(mappedData);

      if (insertError) {
        console.error('❌ Failed to insert AA10424:', insertError.message);
        process.exit(1);
      }

      console.log('✅ AA10424 inserted successfully!');
    }

    // 7. 確認
    const { data: result, error: verifyError } = await supabase
      .from('property_listings')
      .select('property_number, google_map_url, address, updated_at')
      .eq('property_number', 'AA10424')
      .single();

    if (verifyError || !result) {
      console.error('❌ Failed to verify AA10424:', verifyError?.message);
      process.exit(1);
    }

    console.log('\n✅ Verification successful!');
    console.log('Property Number:', result.property_number);
    console.log('Google Map URL:', result.google_map_url);
    console.log('Address:', result.address);
    console.log('Updated At:', result.updated_at);

    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 実行
addAA10424ToPropertyListings();
