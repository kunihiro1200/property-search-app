import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function forceSyncAA13501() {
  console.log('🔄 Force syncing AA13501 from spreadsheet to database...\n');
  
  // Supabaseクライアント
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  
  // Google Sheetsクライアント
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  });
  
  await sheetsClient.authenticate();
  
  // カラムマッパー
  const columnMapper = new ColumnMapper();
  
  try {
    // スプレッドシートから全データを取得
    console.log('📊 Fetching data from spreadsheet...');
    const rows = await sheetsClient.readAll();
    
    // AA13501を検索
    const aa13501Row = rows.find(row => row['売主番号'] === 'AA13501');
    
    if (!aa13501Row) {
      console.log('❌ AA13501 not found in spreadsheet');
      return;
    }
    
    console.log('✅ AA13501 found in spreadsheet\n');
    console.log('📋 Spreadsheet data:');
    console.log('  売主番号:', aa13501Row['売主番号']);
    console.log('  不通:', aa13501Row['不通']);
    console.log('  物件所在地:', aa13501Row['物件所在地']);
    console.log('  コメント:', aa13501Row['コメント']);
    console.log('');
    
    // スプレッドシートデータをデータベース形式に変換
    const dbData = columnMapper.mapToDatabase(aa13501Row);
    
    console.log('📋 Mapped database data:');
    console.log('  seller_number:', dbData.seller_number);
    console.log('  unreachable_status:', dbData.unreachable_status);
    console.log('  property_address:', dbData.property_address);
    console.log('  comments:', dbData.comments);
    console.log('');
    
    // データベースを更新
    console.log('💾 Updating database...');
    const { data, error } = await supabase
      .from('sellers')
      .update({
        unreachable_status: dbData.unreachable_status,
        property_address: dbData.property_address,
        comments: dbData.comments,
        updated_at: new Date().toISOString(),
      })
      .eq('seller_number', 'AA13501')
      .select();
    
    if (error) {
      console.error('❌ Error updating database:', error.message);
      return;
    }
    
    console.log('✅ Database updated successfully!');
    console.log('');
    console.log('📋 Updated data:');
    if (data && data.length > 0) {
      console.log('  seller_number:', data[0].seller_number);
      console.log('  unreachable_status:', data[0].unreachable_status);
      console.log('  property_address:', data[0].property_address);
      console.log('  comments:', data[0].comments);
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

forceSyncAA13501().catch(console.error);
