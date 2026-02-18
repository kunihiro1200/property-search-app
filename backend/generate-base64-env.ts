/**
 * Base64エンコードされたGOOGLE_SERVICE_ACCOUNT_JSON環境変数を生成
 */
import * as fs from 'fs';
import * as path from 'path';

// google-service-account.jsonを読み込み
const keyPath = path.resolve(__dirname, 'google-service-account.json');
const keyFile = fs.readFileSync(keyPath, 'utf8');

// Base64エンコード
const base64String = Buffer.from(keyFile, 'utf8').toString('base64');

console.log('=== Base64 Encoded GOOGLE_SERVICE_ACCOUNT_JSON ===\n');
console.log(base64String);
console.log('\n');
console.log('Length:', base64String.length);
console.log('\n');
console.log('✅ Copy the above Base64 string to Vercel environment variable GOOGLE_SERVICE_ACCOUNT_JSON');
