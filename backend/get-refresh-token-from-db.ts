/**
 * データベースから最新のリフレッシュトークンを取得して表示
 * 
 * 使用方法:
 * cd backend
 * npx ts-node get-refresh-token-from-db.ts
 */

import { decrypt } from './src/utils/encryption';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .envファイルを読み込む
dotenv.config({ path: path.join(__dirname, '.env') });

async function getRefreshToken() {
  console.log('🔍 Fetching refresh token from database...\n');
  
  try {
    // Supabaseクライアントを作成
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    // 管理者ユーザーを取得
    const { data: adminData, error: adminError } = await supabase
      .from('employees')
      .select('id, name, email')
      .eq('role', 'admin')
      .limit(1)
      .single();

    if (adminError || !adminData) {
      console.error('❌ No admin user found');
      process.exit(1);
    }

    console.log(`✅ Admin user found: ${adminData.name} (${adminData.email})`);
    console.log(`   Employee ID: ${adminData.id}\n`);

    // トークンを取得
    const { data: tokenData, error: tokenError } = await supabase
      .from('google_calendar_tokens')
      .select('*')
      .eq('employee_id', adminData.id)
      .single();

    if (tokenError || !tokenData) {
      console.error('❌ No token found for admin user');
      console.log('\n💡 Tip: Run re-authenticate-gmail.ts to authenticate');
      process.exit(1);
    }

    // リフレッシュトークンを復号化
    const refreshToken = decrypt(tokenData.encrypted_refresh_token);

    console.log('✅ Token found!\n');
    console.log('📋 Token Details:');
    console.log(`   Created: ${tokenData.created_at}`);
    console.log(`   Updated: ${tokenData.updated_at}`);
    console.log(`   Scope: ${tokenData.scope}\n`);
    
    console.log('🔑 Refresh Token:');
    console.log(`   ${refreshToken}\n`);
    
    console.log('📝 Update your .env file:');
    console.log(`   GMAIL_REFRESH_TOKEN=${refreshToken}\n`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

getRefreshToken();
