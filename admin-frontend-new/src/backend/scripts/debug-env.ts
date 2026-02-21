import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// .envファイルのパスを明示的に指定
const envPath = path.resolve(__dirname, '../../.env');

console.log('='.repeat(80));
console.log('環境変数デバッグ');
console.log('='.repeat(80));
console.log();
console.log(`📁 .envファイルのパス: ${envPath}`);
console.log(`📄 .envファイルが存在: ${fs.existsSync(envPath) ? 'はい' : 'いいえ'}`);
console.log();

if (fs.existsSync(envPath)) {
  console.log('📋 .envファイルの内容（最初の20行）:');
  console.log('-'.repeat(80));
  const content = fs.readFileSync(envPath, 'utf-8');
  const lines = content.split('\n').slice(0, 20);
  lines.forEach((line, index) => {
    // パスワードやトークンをマスク
    if (line.includes('TOKEN') || line.includes('SECRET') || line.includes('KEY')) {
      const parts = line.split('=');
      if (parts.length > 1) {
        console.log(`${index + 1}: ${parts[0]}=***MASKED***`);
      } else {
        console.log(`${index + 1}: ${line}`);
      }
    } else {
      console.log(`${index + 1}: ${line}`);
    }
  });
  console.log('-'.repeat(80));
  console.log();
}

// dotenvで読み込み
dotenv.config({ path: envPath });

console.log('🔍 読み込まれた環境変数:');
console.log('-'.repeat(80));
console.log(`GOOGLE_SHEETS_SPREADSHEET_ID: ${process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '未設定'}`);
console.log(`GOOGLE_SHEETS_SHEET_NAME: ${process.env.GOOGLE_SHEETS_SHEET_NAME || '未設定'}`);
console.log(`GOOGLE_OAUTH_CLIENT_ID: ${process.env.GOOGLE_OAUTH_CLIENT_ID ? '設定済み' : '未設定'}`);
console.log(`GOOGLE_OAUTH_CLIENT_SECRET: ${process.env.GOOGLE_OAUTH_CLIENT_SECRET ? '設定済み' : '未設定'}`);
console.log(`GOOGLE_OAUTH_REFRESH_TOKEN: ${process.env.GOOGLE_OAUTH_REFRESH_TOKEN ? '設定済み' : '未設定'}`);
console.log('-'.repeat(80));
console.log();
