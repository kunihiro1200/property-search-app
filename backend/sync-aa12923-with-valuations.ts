import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';
import { encrypt } from './src/utils/encryption';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncAA12923() {
  console.log('🔄 Syncing AA12923 with valuations from spreadsheet...\n');

  // Initialize Google Sheets client
  const sheetsConfig = {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  };

  const sheetsClient = new GoogleSheetsClient(sheetsConfig);
  await sheetsClient.authenticate();

  const columnMapper = new ColumnMapper();

  // Get all rows from spreadsheet
  console.log('📊 Fetching data from spreadsheet...');
  const rows = await sheetsClient.readAll();
  
  // Find AA12923
  const aa12923Row = rows.find(row => row['売主番号'] === 'AA12923');
  
  if (!aa12923Row) {
    console.error('❌ AA12923 not found in spreadsheet');
    return;
  }

  console.log('✅ Found AA12923 in spreadsheet\n');
  console.log('Raw data from spreadsheet:');
  console.log('  査定額1（自動計算）v:', aa12923Row['査定額1（自動計算）v']);
  console.log('  査定額2（自動計算）v:', aa12923Row['査定額2（自動計算）v']);
  console.log('  査定額3（自動計算）v:', aa12923Row['査定額3（自動計算）v']);
  console.log('  コメント:', typeof aa12923Row['コメント'] === 'string' ? aa12923Row['コメント'].substring(0, 50) + '...' : aa12923Row['コメント']);

  // Map spreadsheet data to database format
  const mappedData = columnMapper.mapToDatabase(aa12923Row);

  console.log('\nMapped data:');
  console.log('  valuation_amount_1:', mappedData.valuation_amount_1);
  console.log('  valuation_amount_2:', mappedData.valuation_amount_2);
  console.log('  valuation_amount_3:', mappedData.valuation_amount_3);
  console.log('  comments:', mappedData.comments?.substring(0, 50) + '...');

  // Update seller
  const { error } = await supabase
    .from('sellers')
    .update({
      name: mappedData.name ? encrypt(mappedData.name) : null,
      address: mappedData.address ? encrypt(mappedData.address) : null,
      phone_number: mappedData.phone_number ? encrypt(mappedData.phone_number) : null,
      email: mappedData.email ? encrypt(mappedData.email) : null,
      valuation_amount_1: mappedData.valuation_amount_1 || null,
      valuation_amount_2: mappedData.valuation_amount_2 || null,
      valuation_amount_3: mappedData.valuation_amount_3 || null,
      comments: mappedData.comments || null,
      updated_at: new Date().toISOString(),
    })
    .eq('seller_number', 'AA12923');

  if (error) {
    console.error('\n❌ Error updating AA12923:', error);
    return;
  }

  console.log('\n✅ AA12923 updated successfully!\n');

  // Verify the update
  const { data: seller } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA12923')
    .single();

  if (seller) {
    const { decrypt } = await import('./src/utils/encryption');
    console.log('📊 Verified data in database:');
    console.log('  名前:', decrypt(seller.name));
    console.log('  住所:', decrypt(seller.address));
    console.log('  電話番号:', decrypt(seller.phone_number));
    console.log('  メール:', decrypt(seller.email));
    console.log('  査定額1:', seller.valuation_amount_1);
    console.log('  査定額2:', seller.valuation_amount_2);
    console.log('  査定額3:', seller.valuation_amount_3);
    console.log('  コメント (first 100 chars):', seller.comments?.substring(0, 100) + '...');
  }
}

syncAA12923().catch(console.error);
