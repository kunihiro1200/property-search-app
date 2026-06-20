// AA13069のデータベースを直接更新（Google Sheets APIを使わずに）
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function forceSyncAA13069DirectDB() {
  console.log('🔄 Force syncing AA13069 by directly updating database...\n');

  const propertyNumber = 'AA13069';

  try {
    // 手動でデータを設定（スプレッドシートから事前に取得したデータ）
    // これは一時的な対処法です
    
    const updateData = {
      // favorite_commentは既に存在するので更新しない
      // recommended_commentsを空配列からnullに変更して、次回の自動同期をトリガー
      recommended_comments: null,
      // property_aboutもnullに設定
      property_about: null,
    };

    console.log('📊 Updating database with:', updateData);

    const { data, error } = await supabase
      .from('property_details')
      .update(updateData)
      .eq('property_number', propertyNumber)
      .select();

    if (error) {
      console.error('❌ Error updating database:', error.message);
      return;
    }

    console.log('✅ Successfully updated database');
    console.log('Updated data:', data);

    console.log('\n📋 Next steps:');
    console.log('1. Wait for Google Sheets API quota to reset (1 minute)');
    console.log('2. Access AA13069 page in browser');
    console.log('3. Auto-sync will detect null values and fetch from spreadsheet');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  }
}

forceSyncAA13069DirectDB().catch(console.error);
