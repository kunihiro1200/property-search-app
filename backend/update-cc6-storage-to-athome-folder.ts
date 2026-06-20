import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function updateCC6StorageToAthomeFolder() {
  console.log('=== CC6の格納先URLをathome公開フォルダに更新 ===\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // athome公開フォルダのURLを設定
  // ユーザーに確認してから実行
  console.log('⚠️ この操作を実行する前に、athome公開フォルダのURLを確認してください。');
  console.log('');
  console.log('Google Driveで以下の手順を実行:');
  console.log('1. CC6フォルダを開く');
  console.log('2. "athome公開"フォルダを右クリック');
  console.log('3. "リンクを取得"をクリック');
  console.log('4. URLをコピー');
  console.log('');
  console.log('例: https://drive.google.com/drive/folders/XXXXXXXXXX?usp=sharing');
  console.log('');
  console.log('このスクリプトは実行されません。手動でURLを確認してから、');
  console.log('以下のSQLを実行してください:');
  console.log('');
  console.log(`UPDATE property_listings`);
  console.log(`SET storage_location = 'athome公開フォルダのURL'`);
  console.log(`WHERE property_number = 'CC6';`);
}

updateCC6StorageToAthomeFolder().catch(console.error);
