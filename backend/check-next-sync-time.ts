import axios from 'axios';

async function checkNextSyncTime() {
  try {
    console.log('🔍 自動同期のステータスを確認中...\n');

    const response = await axios.get('http://localhost:3000/api/sync/health');
    const health = response.data;

    console.log('📊 自動同期ステータス:');
    console.log('   - 健全性:', health.isHealthy ? '✅ 正常' : '❌ 異常');
    console.log('   - 最後の同期:', health.lastSyncTime ? new Date(health.lastSyncTime).toLocaleString('ja-JP') : '未実行');
    console.log('   - 最後の同期結果:', health.lastSyncSuccess ? '✅ 成功' : '❌ 失敗');
    console.log('   - 同期間隔:', `${health.syncIntervalMinutes}分`);
    console.log('   - 次回同期予定:', health.nextScheduledSync ? new Date(health.nextScheduledSync).toLocaleString('ja-JP') : '不明');
    console.log('   - 連続失敗回数:', health.consecutiveFailures);
    console.log('');

    if (health.lastSyncTime && health.nextScheduledSync) {
      const now = new Date();
      const nextSync = new Date(health.nextScheduledSync);
      const minutesUntilNextSync = Math.ceil((nextSync.getTime() - now.getTime()) / 1000 / 60);

      if (minutesUntilNextSync > 0) {
        console.log(`⏰ 次の自動同期まで: 約${minutesUntilNextSync}分`);
      } else {
        console.log('⏰ 次の自動同期: まもなく実行されます');
      }
    }

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    if (error.response) {
      console.error('   レスポンス:', error.response.data);
    }
  }
}

checkNextSyncTime().catch(console.error);
