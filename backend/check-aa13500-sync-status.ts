import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function checkAA13500SyncStatus() {
  console.log('🔍 Checking AA13500 sync status...\n');
  
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
    // 1. データベースから取得
    console.log('📥 Step 1: Fetching from database...');
    const { data: dbSeller, error: dbError } = await supabase
      .from('sellers')
      .select('*')
      .eq('seller_number', 'AA13500')
      .single();

    if (dbError) {
      console.error('❌ Database error:', dbError);
      return;
    }

    console.log('✅ Database data:');
    console.log('  seller_number:', dbSeller.seller_number);
    console.log('  unreachable_status:', dbSeller.unreachable_status);
    console.log('  is_unreachable:', dbSeller.is_unreachable);
    console.log('  comments:', dbSeller.comments);
    console.log('  valuation_method:', dbSeller.valuation_method);
    console.log('  property_address:', dbSeller.property_address);
    console.log('');

    // 2. スプレッドシートから取得
    console.log('📥 Step 2: Fetching from spreadsheet...');
    const rows = await sheetsClient.readAll();
    
    // AA13500を検索
    const sheetRow = rows.find((row: any) => row['売主番号'] === 'AA13500');

    if (!sheetRow) {
      console.error('❌ AA13500 not found in spreadsheet');
      return;
    }

    console.log('✅ Spreadsheet data (raw):');
    console.log('  売主番号:', sheetRow['売主番号']);
    console.log('  不通:', sheetRow['不通']);
    console.log('  コメント:', sheetRow['コメント']);
    console.log('  査定方法:', sheetRow['査定方法']);
    console.log('  物件所在地:', sheetRow['物件所在地']);
    console.log('');

    // 3. スプレッドシートデータをデータベース形式に変換
    console.log('🔄 Step 3: Mapping spreadsheet data to database format...');
    const dbData = columnMapper.mapToDatabase(sheetRow);
    
    console.log('✅ Mapped database data:');
    console.log('  seller_number:', dbData.seller_number);
    console.log('  unreachable_status:', dbData.unreachable_status);
    console.log('  comments:', dbData.comments);
    console.log('  valuation_method:', dbData.valuation_method);
    console.log('  property_address:', dbData.property_address);
    console.log('');

    // 4. 比較
    console.log('📊 Step 4: Comparison (Database vs Spreadsheet):');
    console.log('');
    console.log('  unreachable_status:');
    console.log('    Database:', dbSeller.unreachable_status);
    console.log('    Spreadsheet (raw):', sheetRow['不通']);
    console.log('    Spreadsheet (mapped):', dbData.unreachable_status);
    console.log('    Match?', dbSeller.unreachable_status === dbData.unreachable_status ? '✅' : '❌');
    console.log('');
    
    console.log('  comments:');
    console.log('    Database:', dbSeller.comments);
    console.log('    Spreadsheet (raw):', sheetRow['コメント']);
    console.log('    Spreadsheet (mapped):', dbData.comments);
    console.log('    Match?', dbSeller.comments === dbData.comments ? '✅' : '❌');
    console.log('');
    
    console.log('  valuation_method:');
    console.log('    Database:', dbSeller.valuation_method);
    console.log('    Spreadsheet (raw):', sheetRow['査定方法']);
    console.log('    Spreadsheet (mapped):', dbData.valuation_method);
    console.log('    Match?', dbSeller.valuation_method === dbData.valuation_method ? '✅' : '❌');
    console.log('');
    
    console.log('  property_address:');
    console.log('    Database:', dbSeller.property_address);
    console.log('    Spreadsheet (raw):', sheetRow['物件所在地']);
    console.log('    Spreadsheet (mapped):', dbData.property_address);
    console.log('    Match?', dbSeller.property_address === dbData.property_address ? '✅' : '❌');
    console.log('');

    // 5. 同期が必要なフィールドを特定
    console.log('🔍 Step 5: Fields that need syncing:');
    const fieldsToSync: string[] = [];
    
    if (dbSeller.unreachable_status !== dbData.unreachable_status) {
      fieldsToSync.push('unreachable_status');
      console.log('  ❌ unreachable_status needs syncing');
    }
    
    if (dbSeller.comments !== dbData.comments) {
      fieldsToSync.push('comments');
      console.log('  ❌ comments needs syncing');
    }
    
    if (dbSeller.valuation_method !== dbData.valuation_method) {
      fieldsToSync.push('valuation_method');
      console.log('  ❌ valuation_method needs syncing');
    }
    
    if (dbSeller.property_address !== dbData.property_address) {
      fieldsToSync.push('property_address');
      console.log('  ❌ property_address needs syncing');
    }
    
    if (fieldsToSync.length === 0) {
      console.log('  ✅ All fields are in sync!');
    } else {
      console.log('');
      console.log(`⚠️  ${fieldsToSync.length} field(s) need syncing: ${fieldsToSync.join(', ')}`);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

checkAA13500SyncStatus().catch(console.error);
