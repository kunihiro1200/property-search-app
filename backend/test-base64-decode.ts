/**
 * Base64デコードのテスト
 */

// 環境変数からBase64文字列を取得（コマンドライン引数から）
const base64String = process.argv[2];

if (!base64String) {
  console.error('Usage: npx ts-node backend/test-base64-decode.ts <base64-string>');
  process.exit(1);
}

console.log('Base64 string length:', base64String.length);
console.log('First 50 chars:', base64String.substring(0, 50));

// Base64デコード
const jsonString = Buffer.from(base64String, 'base64').toString('utf8');
console.log('\nDecoded JSON length:', jsonString.length);
console.log('First 100 chars:', jsonString.substring(0, 100));

// JSONパース
try {
  const keyFile = JSON.parse(jsonString);
  console.log('\n✅ JSON parse successful');
  console.log('client_email:', keyFile.client_email);
  console.log('project_id:', keyFile.project_id);
  
  // private_keyの確認
  console.log('\nPrivate key check:');
  console.log('- Has newlines:', keyFile.private_key.includes('\n'));
  console.log('- Starts with BEGIN:', keyFile.private_key.startsWith('-----BEGIN'));
  console.log('- Length:', keyFile.private_key.length);
  console.log('- First 50 chars:', keyFile.private_key.substring(0, 50));
  
  // 改行を置換
  if (!keyFile.private_key.includes('\n')) {
    console.log('\n⚠️ No newlines found, replacing escaped newlines...');
    keyFile.private_key = keyFile.private_key.replace(/\\n/g, '\n');
    console.log('After replacement:');
    console.log('- Has newlines:', keyFile.private_key.includes('\n'));
    console.log('- First 50 chars:', keyFile.private_key.substring(0, 50));
  }
  
} catch (error: any) {
  console.error('\n❌ JSON parse failed:', error.message);
  process.exit(1);
}
