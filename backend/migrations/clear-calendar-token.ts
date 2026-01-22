import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.resolve(__dirname, '../.env');
console.log('Loading .env from:', envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('Error loading .env:', result.error);
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Missing');
console.log('Service Key:', supabaseServiceKey ? 'Set' : 'Missing');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function clearCalendarToken() {
  try {
    console.log('🗑️  Clearing all Google Calendar tokens...');

    // まず既存のトークンを確認
    const { data: tokens, error: selectError } = await supabase
      .from('google_calendar_tokens')
      .select('*');

    if (selectError) {
      throw selectError;
    }

    console.log(`Found ${tokens?.length || 0} token(s)`);

    if (tokens && tokens.length > 0) {
      // 全てのトークンを削除
      const { error: deleteError } = await supabase
        .from('google_calendar_tokens')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // 全て削除

      if (deleteError) {
        throw deleteError;
      }

      console.log('✅ All Google Calendar tokens cleared successfully');
    } else {
      console.log('ℹ️  No tokens found to clear');
    }

    console.log('');
    console.log('次のステップ:');
    console.log('1. Googleアカウントの設定で「売主リスト管理システム」のアクセス権を削除');
    console.log('2. ブラウザで従業員カレンダー接続状態ページを開く');
    console.log('3. 「会社アカウントでGOOGLEカレンダーを接続」ボタンをクリック');
    console.log('4. Googleアカウントでログインして許可');
    
  } catch (error) {
    console.error('❌ Error clearing token:', error);
    process.exit(1);
  }
}

clearCalendarToken();
