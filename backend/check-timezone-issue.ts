/**
 * タイムゾーン問題を確認
 */

async function checkTimezoneIssue() {
  console.log('=== タイムゾーン確認 ===\n');

  // 現在時刻
  const now = new Date();
  console.log('現在時刻 (UTC):', now.toISOString());
  console.log('現在時刻 (ローカル):', now.toString());

  // 日本時間
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  console.log('現在時刻 (JST):', jstNow.toISOString().replace('Z', '+09:00'));

  // 今日の日付（UTC）
  const todayUTC = new Date();
  todayUTC.setHours(0, 0, 0, 0);
  console.log('\n今日の日付 (UTC 00:00):', todayUTC.toISOString());

  // 今日の日付（JST）
  const todayJST = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const jstDateStr = todayJST.toISOString().split('T')[0];
  console.log('今日の日付 (JST):', jstDateStr);

  // 次電日の比較
  const nextCallDate = new Date('2026-01-31');
  console.log('\n次電日:', nextCallDate.toISOString());
  console.log('次電日 <= 今日 (UTC):', nextCallDate <= todayUTC);

  // JST基準で比較
  const todayJSTDate = new Date(jstDateStr);
  console.log('今日 (JST Date):', todayJSTDate.toISOString());
  console.log('次電日 <= 今日 (JST):', nextCallDate <= todayJSTDate);

  console.log('\n--- 問題の説明 ---');
  console.log('サーバーがUTC時間で動作している場合:');
  console.log('  UTC 2026-01-30 15:00 = JST 2026-01-31 00:00');
  console.log('  つまり、日本時間で1/31なのに、UTCでは1/30と判定される');

  console.log('\n=== 確認完了 ===');
}

checkTimezoneIssue().catch(console.error);
