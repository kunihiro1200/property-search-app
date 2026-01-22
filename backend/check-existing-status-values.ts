import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkExistingStatusValues() {
  console.log('🔍 既存のステータス値を確認中...\n');

  try {
    // すべてのユニークなステータス値を取得
    const { data, error } = await supabase
      .from('sellers')
      .select('status')
      .not('status', 'is', null);

    if (error) {
      throw error;
    }

    // ユニークな値をカウント
    const statusCounts = new Map<string, number>();
    data.forEach((row: any) => {
      const status = row.status;
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    });

    console.log('📊 既存のステータス値とその件数:\n');
    
    // ソートして表示
    const sortedStatuses = Array.from(statusCounts.entries())
      .sort((a, b) => b[1] - a[1]);

    sortedStatuses.forEach(([status, count]) => {
      console.log(`   "${status}": ${count}件`);
    });

    console.log('\n✅ 確認完了');
    console.log(`   合計: ${data.length}件のレコード`);
    console.log(`   ユニークなステータス: ${statusCounts.size}種類`);

    // 新しい制約で許可されるステータス
    const allowedStatuses = [
      'new',
      'following_up',
      'appointment_scheduled',
      'visited',
      'exclusive_contract',
      'general_contract',
      'contracted',
      'other_decision',
      'follow_up_not_needed',
      'lost'
    ];

    console.log('\n🔍 制約違反の確認:');
    let hasViolations = false;
    statusCounts.forEach((count, status) => {
      if (!allowedStatuses.includes(status)) {
        console.log(`   ❌ "${status}": ${count}件 (許可されていない値)`);
        hasViolations = true;
      }
    });

    if (!hasViolations) {
      console.log('   ✅ すべてのステータス値が許可されています');
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

checkExistingStatusValues()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
