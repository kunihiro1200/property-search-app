/**
 * AA13312の現在の状態を確認
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';

async function check() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  
  const supabase = createClient(supabaseUrl!, supabaseKey!);
  
  // 1. DBの値を確認
  const { data: seller, error } = await supabase
    .from('sellers')
    .select('seller_number, next_call_date')
    .eq('seller_number', 'AA13312')
    .single();
  
  console.log('=== AA13312 現在の状態 ===\n');
  console.log('📊 DB:', seller?.next_call_date);
  
  // 2. スプレッドシートの値を確認
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: '売主リスト',
    serviceAccountKeyPath: './google-service-account.json',
  });
  
  await sheetsClient.authenticate();
  
  const allRows = await sheetsClient.readAll();
  const row = allRows.find((r: any) => r['売主番号'] === 'AA13312');
  
  if (row) {
    const rawValue = row['次電日'];
    console.log('📊 スプシ生値:', rawValue);
    
    // パース
    const columnMapper = new ColumnMapper();
    const mapped = columnMapper.mapToDatabase({ '次電日': rawValue });
    console.log('📊 パース後:', mapped.next_call_date);
  } else {
    console.log('❌ スプシにAA13312が見つかりません');
  }
}

check().catch(console.error);
