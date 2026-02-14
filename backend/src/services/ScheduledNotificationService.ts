import { createClient, SupabaseClient } from '@supabase/supabase-js';
import axios from 'axios';

/**
 * スケジュール通知サービス
 * 
 * 予約された通知を指定時刻に送信します。
 * 
 * 使用方法:
 * 1. 定期的に`processScheduledNotifications()`を呼び出す（例: 1分ごと）
 * 2. 送信時刻になった通知を自動的に送信
 * 3. 送信結果をデータベースに記録
 */
export class ScheduledNotificationService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * スケジュールされた通知を処理
   * 
   * 現在時刻を過ぎた通知を送信します。
   * 
   * @returns 処理した通知の数
   */
  async processScheduledNotifications(): Promise<number> {
    try {
      const currentTime = new Date();
      console.log('[ScheduledNotificationService] Current time (UTC):', currentTime.toISOString());
      console.log('[ScheduledNotificationService] Current time (Tokyo):', currentTime.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
      
      // 現在時刻を過ぎた未送信の通知を取得
      const { data: notifications, error } = await this.supabase
        .from('scheduled_notifications')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_at', currentTime.toISOString())
        .order('scheduled_at', { ascending: true });

      if (error) {
        console.error('[ScheduledNotificationService] Failed to fetch notifications:', error);
        return 0;
      }

      if (!notifications || notifications.length === 0) {
        console.log('[ScheduledNotificationService] No notifications to process');
        return 0;
      }

      console.log(`[ScheduledNotificationService] Processing ${notifications.length} scheduled notifications`);
      console.log('[ScheduledNotificationService] Notifications:', notifications.map(n => {
        const scheduledDate = new Date(n.scheduled_at);
        return {
          id: n.id,
          property_number: n.property_number,
          scheduled_at_utc: n.scheduled_at,
          scheduled_at_tokyo: scheduledDate.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
          is_past: scheduledDate <= currentTime,
        };
      }));

      let processedCount = 0;

      for (const notification of notifications) {
        try {
          console.log(`[ScheduledNotificationService] Sending notification:`, {
            id: notification.id,
            property_number: notification.property_number,
            scheduled_at: notification.scheduled_at,
          });
          
          // チャットに送信
          await axios.post(notification.webhook_url, {
            text: notification.message,
          });

          // 送信成功を記録
          await this.supabase
            .from('scheduled_notifications')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
            })
            .eq('id', notification.id);

          console.log(`[ScheduledNotificationService] Sent notification:`, {
            id: notification.id,
            propertyNumber: notification.property_number,
            assignee: notification.assignee,
          });

          processedCount++;
        } catch (error: any) {
          console.error(`[ScheduledNotificationService] Failed to send notification:`, {
            id: notification.id,
            error: error.message,
          });

          // 送信失敗を記録
          await this.supabase
            .from('scheduled_notifications')
            .update({
              status: 'failed',
              error_message: error.message,
            })
            .eq('id', notification.id);
        }
      }

      return processedCount;
    } catch (error: any) {
      console.error('[ScheduledNotificationService] Error processing notifications:', error);
      return 0;
    }
  }

  /**
   * 特定の物件の予約通知を取得
   * 
   * @param propertyNumber - 物件番号
   * @returns 予約通知のリスト
   */
  async getScheduledNotifications(propertyNumber: string) {
    const { data, error } = await this.supabase
      .from('scheduled_notifications')
      .select('*')
      .eq('property_number', propertyNumber)
      .order('scheduled_at', { ascending: true });

    if (error) {
      console.error('[ScheduledNotificationService] Failed to fetch notifications:', error);
      return [];
    }

    return data || [];
  }

  /**
   * 予約通知をキャンセル
   * 
   * @param notificationId - 通知ID
   */
  async cancelScheduledNotification(notificationId: string) {
    const { error } = await this.supabase
      .from('scheduled_notifications')
      .update({
        status: 'cancelled',
      })
      .eq('id', notificationId)
      .eq('status', 'pending'); // pending状態のみキャンセル可能

    if (error) {
      console.error('[ScheduledNotificationService] Failed to cancel notification:', error);
      throw new Error('Failed to cancel notification');
    }

    console.log(`[ScheduledNotificationService] Cancelled notification: ${notificationId}`);
  }
}
