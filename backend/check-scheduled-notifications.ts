import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config();

/**
 * scheduled_notificationsテーブルの内容を確認するスクリプト
 * 
 * 使用方法:
 * npx ts-node backend/check-scheduled-notifications.ts
 */
async function checkScheduledNotifications() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('=== Scheduled Notifications Check ===\n');

  // 現在時刻を表示
  const currentTime = new Date();
  console.log('Current time (UTC):', currentTime.toISOString());
  console.log('Current time (Tokyo):', currentTime.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
  console.log('');

  // 全ての予約通知を取得
  const { data: notifications, error } = await supabase
    .from('scheduled_notifications')
    .select('*')
    .order('scheduled_at', { ascending: true });

  if (error) {
    console.error('Error fetching notifications:', error);
    return;
  }

  if (!notifications || notifications.length === 0) {
    console.log('No scheduled notifications found.');
    return;
  }

  console.log(`Found ${notifications.length} scheduled notifications:\n`);

  // 各通知の詳細を表示
  notifications.forEach((notification, index) => {
    const scheduledDate = new Date(notification.scheduled_at);
    const isPast = scheduledDate <= currentTime;
    const timeDiff = scheduledDate.getTime() - currentTime.getTime();
    const hoursDiff = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutesDiff = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

    console.log(`[${index + 1}] Notification ID: ${notification.id}`);
    console.log(`    Property: ${notification.property_number}`);
    console.log(`    Assignee: ${notification.assignee}`);
    console.log(`    Status: ${notification.status}`);
    console.log(`    Scheduled at (UTC): ${notification.scheduled_at}`);
    console.log(`    Scheduled at (Tokyo): ${scheduledDate.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
    console.log(`    Is past: ${isPast ? 'YES (should be sent)' : 'NO (future)'}`);
    
    if (!isPast) {
      console.log(`    Time until scheduled: ${hoursDiff}h ${minutesDiff}m`);
    } else {
      console.log(`    Time since scheduled: ${Math.abs(hoursDiff)}h ${Math.abs(minutesDiff)}m ago`);
    }
    
    if (notification.sent_at) {
      console.log(`    Sent at: ${notification.sent_at}`);
    }
    
    if (notification.error_message) {
      console.log(`    Error: ${notification.error_message}`);
    }
    
    console.log('');
  });

  // ステータス別の集計
  const statusCounts = notifications.reduce((acc, n) => {
    acc[n.status] = (acc[n.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('=== Status Summary ===');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`${status}: ${count}`);
  });
  console.log('');

  // 送信すべき通知（pending かつ scheduled_at が過去）
  const pendingPastNotifications = notifications.filter(
    n => n.status === 'pending' && new Date(n.scheduled_at) <= currentTime
  );

  if (pendingPastNotifications.length > 0) {
    console.log('⚠️  WARNING: Found pending notifications that should have been sent:');
    pendingPastNotifications.forEach(n => {
      console.log(`    - ${n.property_number} (scheduled at ${new Date(n.scheduled_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })})`);
    });
    console.log('');
    console.log('These notifications should be processed by the cron job.');
    console.log('Check if the cron job is running: /api/cron/process-scheduled-notifications');
  } else {
    console.log('✅ No pending notifications that should have been sent.');
  }
}

checkScheduledNotifications()
  .then(() => {
    console.log('\nDone.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
