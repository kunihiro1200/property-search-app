/**
 * Vercel環境変数の設定状況を確認するスクリプト
 * 
 * このスクリプトは、Vercelにデプロイされた環境で実行されることを想定しています。
 * ローカル環境では、.env.localファイルから環境変数を読み込みます。
 */

// 環境変数の存在確認
function checkEnvVar(name: string): void {
  const value = process.env[name];
  
  if (value) {
    console.log(`✅ ${name}: Set (length: ${value.length} chars)`);
    
    // GOOGLE_SERVICE_ACCOUNT_JSONの場合、JSONとしてパース可能か確認
    if (name === 'GOOGLE_SERVICE_ACCOUNT_JSON') {
      try {
        const parsed = JSON.parse(value);
        console.log(`   - Valid JSON`);
        console.log(`   - project_id: ${parsed.project_id || '(not found)'}`);
        console.log(`   - client_email: ${parsed.client_email || '(not found)'}`);
        console.log(`   - private_key: ${parsed.private_key ? '(exists)' : '(not found)'}`);
      } catch (error: any) {
        console.log(`   ❌ Invalid JSON: ${error.message}`);
        console.log(`   First 100 chars: ${value.substring(0, 100)}`);
      }
    }
  } else {
    console.log(`❌ ${name}: Not set`);
  }
}

console.log('🔍 Checking Vercel environment variables...\n');
console.log('─'.repeat(60));

// 必須環境変数をチェック
const requiredEnvVars = [
  'GOOGLE_SERVICE_ACCOUNT_JSON',
  'GOOGLE_DRIVE_PARENT_FOLDER_ID',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

for (const envVar of requiredEnvVars) {
  checkEnvVar(envVar);
  console.log('');
}

console.log('─'.repeat(60));
console.log('✅ Check complete');
