/**
 * 個別の環境変数（GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY）を使用した認証テスト
 */
import * as fs from 'fs';
import * as path from 'path';

// google-service-account.jsonを読み込み
const keyPath = path.resolve(__dirname, 'google-service-account.json');
const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

console.log('=== Individual Environment Variables Test ===\n');

// 1. client_emailを出力
console.log('GOOGLE_SERVICE_ACCOUNT_EMAIL:');
console.log(keyFile.client_email);
console.log('');

// 2. private_keyを出力（エスケープされた形式）
console.log('GOOGLE_PRIVATE_KEY (escaped):');
const escapedPrivateKey = keyFile.private_key.replace(/\n/g, '\\n');
console.log(escapedPrivateKey);
console.log('');

// 3. private_keyの長さを確認
console.log('Private key length:', keyFile.private_key.length);
console.log('Escaped private key length:', escapedPrivateKey.length);
console.log('');

// 4. private_keyの最初の50文字を確認
console.log('First 50 chars:', keyFile.private_key.substring(0, 50));
console.log('');

// 5. エスケープ解除のテスト
console.log('=== Unescape Test ===');
const unescapedPrivateKey = escapedPrivateKey.replace(/\\n/g, '\n');
console.log('Unescaped private key matches original:', unescapedPrivateKey === keyFile.private_key);
console.log('');

console.log('✅ Test completed');
console.log('');
console.log('📋 Copy these values to Vercel environment variables:');
console.log('');
console.log('GOOGLE_SERVICE_ACCOUNT_EMAIL:');
console.log(keyFile.client_email);
console.log('');
console.log('GOOGLE_PRIVATE_KEY:');
console.log(escapedPrivateKey);
