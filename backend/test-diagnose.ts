console.log('診断スクリプトテスト開始');
console.log('引数:', process.argv.slice(2));
console.log('環境変数チェック:');
console.log('  SUPABASE_URL:', process.env.SUPABASE_URL ? '設定済み' : '未設定');
console.log('テスト完了');
