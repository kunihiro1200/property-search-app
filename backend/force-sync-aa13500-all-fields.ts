import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function forceSyncAA13500AllFields() {
  console.log('🔄 Force syncing AA13500 all fields from spreadsheet to database...\n');
  
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
    
    // AA13500を検索
    const aa13500Row = rows.find(row => row['売主番号'] === 'AA13500');
    
    if (!aa13500Row) {
      console.log('❌ AA13500 not found in spreadsheet');
      return;
    }
    
    console.log('✅ AA13500 found in spreadsheet\n');
    console.log('📋 Spreadsheet data (raw):');
    console.log('  売主番号:', aa13500Row['売主番号']);
    console.log('  不通:', aa13500Row['不通']);
    console.log('  コメント:', aa13500Row['コメント']?.substring(0, 50) + '...');
    console.log('  査定方法:', aa13500Row['査定方法']);
    console.log('  物件所在地:', aa13500Row['物件所在地']);
    console.log('');
    
    // スプレッドシートデータをデータベース形式に変換
    const dbData = columnMapper.mapToDatabase(aa13500Row);
    
    console.log('📋 Mapped database data:');
    console.log('  seller_number:', dbData.seller_number);
    console.log('  unreachable_status:', dbData.unreachable_status);
    console.log('  comments:', dbData.comments?.substring(0, 50) + '...');
    console.log('  valuation_method:', dbData.valuation_method);
    console.log('  property_address:', dbData.property_address);
    console.log('');
    
    // データベースを更新
    console.log('💾 Updating database...');
    const { data, error } = await supabase
      .from('sellers')
      .update({
        unreachable_status: dbData.unreachable_status,
        comments: dbData.comments,
        valuation_method: dbData.valuation_method,
        property_address: dbData.property_address,
        updated_at: new Date().toISOString(),
      })
      .eq('seller_number', 'AA13500')
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
      console.log('  comments:', data[0].comments?.substring(0, 50) + '...');
      console.log('  valuation_method:', data[0].valuation_method);
      console.log('  property_address:', data[0].property_address);
    }
    
    console.log('');
    console.log('✅ All fields synced successfully!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('  1. Reload the browser (Ctrl+Shift+R in incognito mode)');
    console.log('  2. Check that the following are displayed:');
    console.log('     - 不通セクション: "不通" status');
    console.log('     - コメント: Full comment text');
    console.log('     - 物件所在地: "大分市星和台2丁目2の18の9"');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

forceSyncAA13500AllFields().catch(console.error);
