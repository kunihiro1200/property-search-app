// CC21のパノラマURL同期テスト
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function testCC21PanoramaSync() {
  try {
    console.log('🔍 CC21のパノラマURL同期テスト開始\n');
    
    // Supabaseクライアントを作成
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // CC21のスプレッドシートID（業務依頼シートから取得済み）
    const spreadsheetId = '1ydteBGDPxs_20OuL67e6seig9-V43E69djAgm7Vf6sA';
    
    console.log('📄 スプレッドシートID:', spreadsheetId);
    
    // ========================================
    // ステップ1: athomeシートのN1セルからパノラマURLを取得
    // ========================================
    console.log('\n🔍 N1セルの値だけを取得中...');
    
    const { google } = require('googleapis');
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 'google-service-account.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    
    // N1セルの値だけを取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: 'athome!N1',
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    
    console.log('📊 取得したデータ:', JSON.stringify(response.data, null, 2));
    
    const values = response.data.values;
    
    if (!values || values.length === 0 || values[0].length === 0) {
      console.log('❌ N1セルが空です');
      return;
    }
    
    const panoramaUrl = String(values[0][0]);
    console.log('\n✅ パノラマURL取得:', panoramaUrl);
    
    // ========================================
    // ステップ2: データベースに保存
    // ========================================
    console.log('\n💾 データベースに保存中...');
    
    // 現在のデータベースから取得
    const { data: currentDetails, error: fetchError } = await supabase
      .from('property_details')
      .select('athome_data')
      .eq('property_number', 'CC21')
      .single();
    
    if (fetchError) {
      console.error('❌ データベース取得エラー:', fetchError.message);
      return;
    }
    
    console.log('📋 現在のathome_data:', JSON.stringify(currentDetails?.athome_data));
    
    let folderUrl = '';
    if (currentDetails?.athome_data && Array.isArray(currentDetails.athome_data) && currentDetails.athome_data.length > 0) {
      folderUrl = currentDetails.athome_data[0] || '';
    }
    
    // フォルダURLがパノラマURLの場合は空にする
    if (folderUrl && folderUrl.includes('vrpanorama.athome.jp')) {
      console.log('⚠️ フォルダURLがパノラマURLなので空にします');
      folderUrl = '';
    }
    
    // 正しい配列構造を作成
    const athomeDataArray = [folderUrl, panoramaUrl];
    console.log('📝 新しいathome_data:', JSON.stringify(athomeDataArray));
    
    // データベースに保存
    const { error: updateError } = await supabase
      .from('property_details')
      .update({
        athome_data: athomeDataArray,
        updated_at: new Date().toISOString(),
      })
      .eq('property_number', 'CC21');
    
    if (updateError) {
      console.error('❌ データベース更新エラー:', updateError.message);
      return;
    }
    
    console.log('\n✅ データベースに保存しました！');
    
    // 確認
    const { data: updatedDetails } = await supabase
      .from('property_details')
      .select('athome_data')
      .eq('property_number', 'CC21')
      .single();
    
    console.log('\n📋 更新後のathome_data:', JSON.stringify(updatedDetails?.athome_data));
    
  } catch (error: any) {
    console.error('\n❌ エラー:', error.message);
    console.error(error.stack);
  }
}

testCC21PanoramaSync()
  .then(() => {
    console.log('\n🎉 テスト完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('テスト失敗:', error);
    process.exit(1);
  });
