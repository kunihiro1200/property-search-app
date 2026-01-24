// Vercel環境変数の認証テスト用スクリプト
// このスクリプトは、Vercel環境でGOOGLE_SERVICE_ACCOUNT_JSONが正しく設定されているかテストします

import dotenv from 'dotenv';

dotenv.config();

console.log('=== Vercel環境変数チェック ===\n');

console.log('1. GOOGLE_SERVICE_ACCOUNT_JSON:');
if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
  console.log('   ✅ 設定されています');
  console.log(`   長さ: ${process.env.GOOGLE_SERVICE_ACCOUNT_JSON.length} 文字`);
  
  try {
    const keyFile = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    console.log('   ✅ JSONパース成功');
    console.log(`   client_email: ${keyFile.client_email || '(なし)'}`);
    console.log(`   private_key: ${keyFile.private_key ? '設定済み' : '(なし)'}`);
    
    if (keyFile.private_key) {
      // \\nが含まれているか確認
      if (keyFile.private_key.includes('\\n')) {
        console.log('   ⚠️  private_keyに\\\\nが含まれています（変換が必要）');
      } else if (keyFile.private_key.includes('\n')) {
        console.log('   ✅ private_keyに改行が含まれています');
      } else {
        console.log('   ❌ private_keyに改行がありません');
      }
    }
  } catch (error: any) {
    console.log('   ❌ JSONパース失敗:', error.message);
  }
} else {
  console.log('   ❌ 設定されていません');
}

console.log('\n2. GOOGLE_SERVICE_ACCOUNT_KEY_PATH:');
console.log(`   ${process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || '(設定されていません)'}`);

console.log('\n3. GOOGLE_SHEETS_BUYER_SPREADSHEET_ID:');
console.log(`   ${process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID || '(設定されていません)'}`);

console.log('\n4. GOOGLE_SHEETS_BUYER_SHEET_NAME:');
console.log(`   ${process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '(設定されていません)'}`);
