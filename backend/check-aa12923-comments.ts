import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAA12923Comments() {
  console.log('🔍 Checking AA12923 comments from both spreadsheet and database...\n');

  try {
    // 1. スプレッドシートからデータを取得
    console.log('📊 Fetching from spreadsheet...');
    const sheetsConfig = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };
    
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();
    
    const rows = await sheetsClient.readAll();
    const aa12923Row = rows.find(row => row['売主番号'] === 'AA12923');
    
    if (aa12923Row) {
      console.log('✅ Found AA12923 in spreadsheet');
      console.log('  売主番号:', aa12923Row['売主番号']);
      console.log('  コメント (raw):', aa12923Row['コメント']);
      console.log('  コメント (type):', typeof aa12923Row['コメント']);
      const commentValue = aa12923Row['コメント'];
      const commentLength = typeof commentValue === 'string' ? commentValue.length : 0;
      console.log('  コメント (length):', commentLength);
      
      // ColumnMapperでマッピング
      const columnMapper = new ColumnMapper();
      const mappedData = columnMapper.mapToDatabase(aa12923Row);
      console.log('\n📝 Mapped data:');
      console.log('  comments:', mappedData.comments);
      console.log('  comments (type):', typeof mappedData.comments);
      console.log('  comments (length):', mappedData.comments?.length || 0);
    } else {
      console.log('❌ AA12923 not found in spreadsheet');
    }

    // 2. データベースからデータを取得
    console.log('\n💾 Fetching from database...');
    const { data: seller, error } = await supabase
      .from('sellers')
      .select('*')
      .eq('seller_number', 'AA12923')
      .single();

    if (error || !seller) {
      console.error('❌ Error fetching from database:', error);
      return;
    }

    console.log('✅ Found AA12923 in database');
    console.log('  seller_number:', seller.seller_number);
    console.log('  comments (raw):', seller.comments);
    console.log('  comments (type):', typeof seller.comments);
    console.log('  comments (length):', seller.comments?.length || 0);

    // 比較
    console.log('\n🔄 Comparison:');
    if (aa12923Row) {
      const sheetComments = aa12923Row['コメント'];
      const dbComments = seller.comments;
      
      if (sheetComments === dbComments) {
        console.log('✅ Comments match!');
      } else {
        console.log('❌ Comments do NOT match!');
        console.log('  Spreadsheet:', sheetComments);
        console.log('  Database:', dbComments);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkAA12923Comments().catch(console.error);
