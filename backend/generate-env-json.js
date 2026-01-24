const fs = require('fs');

// google-service-account.jsonを読み込む
const serviceAccount = JSON.parse(fs.readFileSync('./google-service-account.json', 'utf8'));

// private_keyの改行を\nに変換（既に\nの場合はそのまま）
if (serviceAccount.private_key) {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\n/g, '\\n');
}

// JSON文字列として出力（改行なし、1行）
const jsonString = JSON.stringify(serviceAccount);

console.log('=== Vercel環境変数用のJSON（以下をコピーしてください） ===\n');
console.log(jsonString);
console.log('\n=== コピー完了 ===');

// ファイルにも保存
fs.writeFileSync('./google-service-account-for-vercel.txt', jsonString);
console.log('\nファイルにも保存しました: ./google-service-account-for-vercel.txt');
