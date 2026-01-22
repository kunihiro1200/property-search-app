import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkDisplayAddressType() {
  console.log('=== display_addressフィールドの型を確認 ===\n');
  
  try {
    // Try to insert a long value to test the field type
    const longAddress = '別府市上人ケ浜町10組-1  シーサイド上人2　505　これは50文字を超える長いテストアドレスです';
    
    console.log(`テスト用の長いアドレス (${longAddress.length}文字):`);
    console.log(`"${longAddress}"\n`);
    
    const { error } = await supabase
      .from('buyers')
      .insert({
        buyer_number: 99999,
        name: 'テストユーザー',
        display_address: longAddress
      })
      .select();

    if (error) {
      if (error.message.includes('value too long')) {
        console.log('❌ display_addressはまだVARCHAR(50)です');
        console.log(`   エラー: ${error.message}`);
        console.log('\n💡 解決策:');
        console.log('   Supabase SQL Editorで以下のSQLを実行してください:');
        console.log('   ALTER TABLE buyers ALTER COLUMN display_address TYPE TEXT;');
      } else {
        console.log(`❌ その他のエラー: ${error.message}`);
      }
    } else {
      console.log('✅ display_addressはTEXT型です（長い値を挿入できました）');
      
      // Clean up test data
      await supabase
        .from('buyers')
        .delete()
        .eq('buyer_number', 99999);
      
      console.log('   テストデータを削除しました');
    }
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

checkDisplayAddressType();
