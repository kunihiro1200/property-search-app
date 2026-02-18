/**
 * ローカル環境で物件リスト同期をテスト
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

// backend/.envを読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { PropertyListingSyncService } from './api/src/services/PropertyListingSyncService';

async function testPropertyListingSync() {
  console.log('🔄 Testing property listing sync locally...\n');

  // 環境変数をクリア（serviceAccountKeyPathを優先させるため）
  delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  delete process.env.GOOGLE_PRIVATE_KEY;

  // ローカル環境用の環境変数を設定
  process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH = 'backend/google-service-account.json';
  process.env.PROPERTY_LISTING_SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
  process.env.PROPERTY_LISTING_SHEET_NAME = '物件';
  process.env.GYOMU_LIST_SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
  process.env.GYOMU_LIST_SHEET_NAME = '業務依頼';

  try {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    }

    const service = new PropertyListingSyncService(supabaseUrl, supabaseServiceKey);

    console.log('📝 Initializing service...');
    await service.initialize();

    console.log('✅ Service initialized successfully!');
    console.log('\n🔄 Running full sync...\n');

    const result = await service.runFullSync('manual');

    console.log('\n✅ Sync completed!');
    console.log('Result:', JSON.stringify(result, null, 2));

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Error stack:', error.stack);
  }
}

testPropertyListingSync();
