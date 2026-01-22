// マイグレーション050が実行されたか確認
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '.env') });

async function verify() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('\n=== マイグレーション050の実行確認 ===\n');

  // Check a few key fields that should have been converted
  const fieldsToCheck = [
    'athome_url',
    'inquiry_hearing',
    'past_inquiry_comment_property',
    'no_response_after_inquiry',
    'name',
    'email',
    'phone_number'
  ];

  console.log('以下のフィールドがTEXT型に変換されているか確認中...\n');

  for (const field of fieldsToCheck) {
    // Try to insert a long value (>50 chars) to test
    const testValue = 'x'.repeat(100); // 100文字のテスト文字列
    const testBuyerNumber = `TEST_${Date.now()}_${field}`;
    
    const { error } = await supabase
      .from('buyers')
      .insert({
        buyer_number: testBuyerNumber,
        name: field === 'name' ? testValue : 'Test',
        [field]: testValue
      });

    if (error) {
      if (error.message.includes('value too long for type character varying(50)')) {
        console.log(`❌ ${field}: まだVARCHAR(50)です - マイグレーション未実行`);
      } else {
        console.log(`⚠️  ${field}: エラー - ${error.message}`);
      }
    } else {
      console.log(`✅ ${field}: TEXT型に変換済み`);
      // Clean up test data
      await supabase
        .from('buyers')
        .delete()
        .eq('buyer_number', testBuyerNumber);
    }
  }

  console.log('\n=== 確認完了 ===\n');
  console.log('すべてのフィールドに✅が表示されていれば、マイグレーション050は正常に実行されています。');
  console.log('❌が表示されている場合は、Supabase SQL Editorでマイグレーション050を実行してください。\n');
}

verify().catch(console.error);
