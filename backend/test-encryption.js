// 暗号化テスト
require('dotenv').config();
const { encrypt, decrypt } = require('./src/utils/encryption.ts');

const testData = [
  '山田太郎',
  '東京都渋谷区1-2-3',
  '090-1234-5678',
  'test@example.com'
];

console.log('🔐 暗号化テスト開始\n');

testData.forEach((text, index) => {
  try {
    const encrypted = encrypt(text);
    const decrypted = decrypt(encrypted);
    const match = text === decrypted;
    
    console.log(`テスト ${index + 1}:`);
    console.log(`  元データ: ${text}`);
    console.log(`  暗号化: ${encrypted.substring(0, 50)}...`);
    console.log(`  復号化: ${decrypted}`);
    console.log(`  一致: ${match ? '✅' : '❌'}\n`);
  } catch (error) {
    console.error(`❌ エラー:`, error.message);
  }
});

console.log('✅ 暗号化テスト完了');
