import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA13500UnreachableAndComments() {
  console.log('🔍 Checking AA13500 unreachable status and comments...\n');

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
    console.log('');

    // 2. スプレッドシートから取得
    console.log('📥 Step 2: Fetching from spreadsheet...');
    
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト';
    
    console.log('  Spreadsheet ID:', spreadsheetId ? 'Set' : 'Not set');
    console.log('  Sheet Name:', sheetName);
    
    if (!spreadsheetId) {
      console.error('❌ GOOGLE_SHEETS_SPREADSHEET_ID not set');
      return;
    }
    
    const sheetsClient = new GoogleSheetsClient(spreadsheetId, sheetName);

    await sheetsClient.initialize();
    const rows = await sheetsClient.readAll();

    // AA13500を検索
    const sheetRow = rows.find((row: any) => row['売主番号'] === 'AA13500');

    if (!sheetRow) {
      console.error('❌ AA13500 not found in spreadsheet');
      return;
    }

    console.log('✅ Spreadsheet data:');
    
    // ヘッダーを確認
    const headers = Object.keys(sheetRow);
    console.log('\n📋 Available columns in spreadsheet:');
    headers.forEach((header, index) => {
      if (header.includes('不通') || header.includes('コメント') || header.includes('査定')) {
        console.log(`  ${String.fromCharCode(65 + index)}列: ${header} = "${sheetRow[header]}"`);
      }
    });

    // 不通関連のカラムを探す
    console.log('\n🔍 Searching for unreachable-related columns:');
    const unreachableColumns = headers.filter(h => 
      h.includes('不通') || h.includes('ふつう') || h.includes('フツウ')
    );
    unreachableColumns.forEach(col => {
      console.log(`  "${col}": "${sheetRow[col]}"`);
    });

    // コメント関連のカラムを探す
    console.log('\n🔍 Searching for comment-related columns:');
    const commentColumns = headers.filter(h => 
      h.includes('コメント') || h.includes('こめんと') || h.includes('備考')
    );
    commentColumns.forEach(col => {
      console.log(`  "${col}": "${sheetRow[col]}"`);
    });

    // 査定方法
    console.log('\n🔍 Valuation method column:');
    const valuationMethodColumns = headers.filter(h => 
      h.includes('査定方法') || h.includes('査定')
    );
    valuationMethodColumns.forEach(col => {
      console.log(`  "${col}": "${sheetRow[col]}"`);
    });

    // 3. 比較
    console.log('\n📊 Comparison:');
    console.log('  Database unreachable_status:', dbSeller.unreachable_status);
    console.log('  Spreadsheet 不通:', sheetRow['不通'] || '(not found)');
    console.log('');
    console.log('  Database comments:', dbSeller.comments);
    console.log('  Spreadsheet コメント:', sheetRow['コメント'] || '(not found)');
    console.log('');
    console.log('  Database valuation_method:', dbSeller.valuation_method);
    console.log('  Spreadsheet 査定方法:', sheetRow['査定方法'] || '(not found)');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

checkAA13500UnreachableAndComments();
