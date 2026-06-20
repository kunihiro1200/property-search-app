import { google } from 'googleapis';
import { BaseRepository } from '../repositories/BaseRepository';

export interface SyncToken {
  id: string;
  employee_id: string;
  sync_token: string;
  last_sync_at: string;
  created_at: string;
  updated_at: string;
}

export interface SyncResult {
  deletedEvents: string[];
  modifiedEvents: string[];
  newEvents: string[];
  nextSyncToken: string;
}

export class CalendarSyncService extends BaseRepository {
  private readonly MAX_RETRIES = 5;
  private readonly INITIAL_BACKOFF_MS = 1000;

  constructor() {
    super();
  }

  /**
   * Sync tokenを取得
   * @param employeeId 従業員ID
   * @returns Sync token（存在しない場合はnull）
   */
  async getSyncToken(employeeId: string): Promise<string | null> {
    try {
      const { data, error } = await this.table('calendar_sync_tokens')
        .select('sync_token')
        .eq('employee_id', employeeId)
        .single();

      if (error || !data) {
        return null;
      }

      return data.sync_token;
    } catch (error) {
      return null;
    }
  }

  /**
   * Sync tokenを保存
   * @param employeeId 従業員ID
   * @param syncToken 新しいsync token
   */
  async saveSyncToken(employeeId: string, syncToken: string): Promise<void> {
    try {
      const { error } = await this.table('calendar_sync_tokens').upsert(
        {
          employee_id: employeeId,
          sync_token: syncToken,
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'employee_id',
        }
      );

      if (error) {
        throw new Error(`Failed to save sync token: ${error.message}`);
      }

      console.log(`✅ Sync token saved for employee ${employeeId}`);
    } catch (error: any) {
      console.error('Failed to save sync token:', error);
      throw error;
    }
  }

  /**
   * カレンダーの変更を増分同期
   * @param employeeId 従業員ID
   * @param oauth2Client 認証済みOAuth2クライアント
   * @returns 同期結果
   */
  async syncCalendarChanges(employeeId: string, oauth2Client: any): Promise<SyncResult> {
    try {
      console.log(`🔄 Starting calendar sync for employee ${employeeId}`);

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const syncToken = await this.getSyncToken(employeeId);

      let response;

      if (syncToken) {
        // 増分同期（sync tokenを使用）
        console.log(`   Using sync token for incremental sync`);
        response = await calendar.events.list({
          calendarId: 'primary',
          syncToken: syncToken,
          maxResults: 100,
        });
      } else {
        // 初回同期（sync tokenを取得するため）
        console.log(`   Performing initial sync`);
        response = await calendar.events.list({
          calendarId: 'primary',
          maxResults: 2500, // 最大値を指定してsync tokenを取得
        });
      }

      const events = response.data.items || [];
      const nextSyncToken = response.data.nextSyncToken;

      console.log(`   API Response: nextSyncToken=${nextSyncToken ? 'present' : 'missing'}, events=${events.length}`);

      if (!nextSyncToken) {
        // nextPageTokenがある場合は、すべてのページを取得する必要がある
        if (response.data.nextPageToken) {
          console.log(`   ⚠️ More pages available, fetching all pages...`);
          let pageToken: string | undefined | null = response.data.nextPageToken;
          let allEvents = [...events];

          while (pageToken) {
            const pageResponse: any = await calendar.events.list({
              calendarId: 'primary',
              maxResults: 2500,
              pageToken: pageToken,
            });

            allEvents = [...allEvents, ...(pageResponse.data.items || [])];
            pageToken = pageResponse.data.nextPageToken;

            if (pageResponse.data.nextSyncToken) {
              // sync tokenを取得
              response = pageResponse;
              break;
            }
          }

          if (!response.data.nextSyncToken) {
            throw new Error('No sync token received after fetching all pages');
          }
        } else {
          throw new Error('No sync token received from Google Calendar API');
        }
      }

      // nextSyncTokenが確実に存在することを確認
      if (!response.data.nextSyncToken) {
        throw new Error('No sync token in final response');
      }

      const finalNextSyncToken = response.data.nextSyncToken;

      // イベントを分類
      const deletedEvents: string[] = [];
      const modifiedEvents: string[] = [];
      const newEvents: string[] = [];

      for (const event of events) {
        if (!event.id) continue;

        if (event.status === 'cancelled') {
          deletedEvents.push(event.id);
        } else if (event.updated) {
          // 既存イベントの更新か新規イベントかを判定
          // ここでは簡略化のため、すべてmodifiedとして扱う
          modifiedEvents.push(event.id);
        }
      }

      console.log(`   Found ${deletedEvents.length} deleted events`);
      console.log(`   Found ${modifiedEvents.length} modified events`);

      // 削除されたイベントを処理
      if (deletedEvents.length > 0) {
        await this.processDeletedEvents(deletedEvents);
      }

      // 新しいsync tokenを保存
      await this.saveSyncToken(employeeId, finalNextSyncToken);

      console.log(`✅ Calendar sync completed for employee ${employeeId}`);

      return {
        deletedEvents,
        modifiedEvents,
        newEvents,
        nextSyncToken: finalNextSyncToken,
      };
    } catch (error: any) {
      console.error('Calendar sync error:', error);

      // Sync tokenが無効な場合は削除して再試行を促す
      if (error.message?.includes('Sync token is no longer valid')) {
        console.warn(`⚠️ Invalid sync token, clearing for employee ${employeeId}`);
        await this.clearSyncToken(employeeId);
      }

      throw new Error(`Calendar sync failed: ${error.message}`);
    }
  }

  /**
   * 削除されたイベントを処理
   * @param deletedEventIds 削除されたイベントIDのリスト
   */
  async processDeletedEvents(deletedEventIds: string[]): Promise<void> {
    try {
      console.log(`🗑️ Processing ${deletedEventIds.length} deleted events`);

      // CalendarServiceをインポートして使用
      const { CalendarService } = await import('./CalendarService');
      const calendarService = new CalendarService();

      // 各削除イベントに対して予約を削除
      for (const eventId of deletedEventIds) {
        try {
          await calendarService.deleteAppointmentByCalendarEventId(eventId, 'calendar_sync');
        } catch (error: any) {
          console.error(`   ⚠️ Failed to delete appointment for event ${eventId}:`, error.message);
          // 個別のエラーは記録するが、処理は継続
        }
      }

      console.log(`✅ Deleted events processed`);
    } catch (error: any) {
      console.error('Failed to process deleted events:', error);
      throw error;
    }
  }

  /**
   * Sync tokenをクリア
   * @param employeeId 従業員ID
   */
  private async clearSyncToken(employeeId: string): Promise<void> {
    try {
      const { error } = await this.table('calendar_sync_tokens')
        .delete()
        .eq('employee_id', employeeId);

      if (error) {
        console.error(`Failed to clear sync token: ${error.message}`);
      }
    } catch (error) {
      console.error('Error clearing sync token:', error);
    }
  }

  /**
   * リトライロジック付きで同期を実行
   * @param employeeId 従業員ID
   * @param oauth2Client 認証済みOAuth2クライアント
   * @returns 同期結果
   */
  async syncWithRetry(employeeId: string, oauth2Client: any): Promise<SyncResult> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          // 指数バックオフ: 1s, 2s, 4s, 8s, 16s
          const backoffMs = this.INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
          console.log(`⏳ Retry attempt ${attempt + 1}/${this.MAX_RETRIES} after ${backoffMs}ms`);
          await this.sleep(backoffMs);
        }

        return await this.syncCalendarChanges(employeeId, oauth2Client);
      } catch (error: any) {
        lastError = error;
        console.error(`❌ Sync attempt ${attempt + 1} failed:`, error.message);

        // 認証エラーの場合はリトライしない
        if (error.message?.includes('GOOGLE_AUTH_REQUIRED')) {
          throw error;
        }
      }
    }

    throw new Error(
      `Calendar sync failed after ${this.MAX_RETRIES} attempts: ${lastError?.message}`
    );
  }

  /**
   * スリープ
   * @param ms ミリ秒
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * すべての接続済み従業員のカレンダーを同期
   * @returns 同期結果のマップ（従業員ID -> 同期結果）
   */
  async syncAllConnectedEmployees(): Promise<Map<string, SyncResult>> {
    try {
      console.log(`🔄 Starting sync for all connected employees`);

      // すべての接続済み従業員を取得
      const { data: tokens, error } = await this.table('google_calendar_tokens')
        .select('employee_id');

      if (error) {
        throw new Error(`Failed to fetch connected employees: ${error.message}`);
      }

      if (!tokens || tokens.length === 0) {
        console.log(`   No connected employees found`);
        return new Map();
      }

      console.log(`   Found ${tokens.length} connected employees`);

      const results = new Map<string, SyncResult>();

      // 各従業員のカレンダーを同期
      for (const token of tokens) {
        try {
          // OAuth2クライアントを取得
          // この実装はGoogleAuthServiceを使用
          console.log(`   Syncing employee ${token.employee_id}`);
          // TODO: 実装
        } catch (error: any) {
          console.error(`   Failed to sync employee ${token.employee_id}:`, error.message);
        }
      }

      console.log(`✅ Sync completed for all employees`);
      return results;
    } catch (error: any) {
      console.error('Failed to sync all employees:', error);
      throw error;
    }
  }
}
