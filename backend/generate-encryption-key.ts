import crypto from 'crypto';

/**
 * 暗号化キーを生成するスクリプト
 * 
 * AES-256-GCMに必要な32バイト（32文字）のランダムキーを生成します。
 */

const key = crypto.randomBytes(32).toString('hex').substring(0, 32);

console.log('=== 暗号化キー生成 ===\n');
console.log('以下のキーを .env.local ファイルに追加してください：\n');
console.log(`ENCRYPTION_KEY="${key}"\n`);
console.log('注意: このキーは安全に保管してください。');
console.log('     このキーを失うと、暗号化されたデータを復号化できなくなります。');
