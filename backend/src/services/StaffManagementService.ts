import { GoogleSheetsClient } from './GoogleSheetsClient';

/**
 * スタッフ情報
 */
export interface StaffInfo {
  initials: string;
  name: string;
  chatWebhook: string | null;
}

/**
 * Webhook URL取得結果
 */
export interface GetWebhookUrlResult {
  success: boolean;
  webhookUrl?: string;
  error?: string;
}

/**
 * スタッフ管理サービス
 * 
 * スタッフ管理スプレッドシートからスタッフ情報を取得し、
 * 担当者名からGoogle Chat Webhook URLを取得します。
 * 
 * スプレッドシート構造:
 * - A列: イニシャル
 * - C列: 名前
 * - F列: Chat webhook
 * 
 * キャッシュ機能:
 * - スタッフ情報を60分間キャッシュ
 * - 手動でキャッシュをクリア可能
 */
export class StaffManagementService {
  private cache: Map<string, StaffInfo> = new Map();
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION_MS = 60 * 60 * 1000; // 60分
  private readonly SPREADSHEET_ID = '19yAuVYQRm-_zhjYX7M7zjiGbnBibkG77Mpz93sN1xxs';
  private readonly SHEET_NAME = 'スタッフ';

  /**
   * 担当者名からWebhook URLを取得
   * 
   * @param assigneeName - 担当者名（イニシャルまたは名前）
   * @returns Webhook URL取得結果
   * 
   * 検索ロジック:
   * 1. イニシャル（A列）で完全一致検索
   * 2. 名前（C列）で完全一致検索
   * 3. どちらも一致しない場合はエラー
   * 
   * エラーケース:
   * - 担当者が見つからない: "担当者が見つかりませんでした"
   * - Webhook URLが空: "担当者のChat webhook URLが設定されていません"
   * - スプレッドシートアクセスエラー: "スタッフ情報の取得に失敗しました"
   */
  async getWebhookUrl(assigneeName: string): Promise<GetWebhookUrlResult> {
    try {
      // スタッフデータを取得（キャッシュ付き）
      const staffData = await this.fetchStaffData();

      // イニシャルまたは名前で検索
      const staff = staffData.find(
        s => s.initials === assigneeName || s.name === assigneeName
      );

      if (!staff) {
        return {
          success: false,
          error: '担当者が見つかりませんでした'
        };
      }

      if (!staff.chatWebhook) {
        return {
          success: false,
          error: '担当者のChat webhook URLが設定されていません'
        };
      }

      return {
        success: true,
        webhookUrl: staff.chatWebhook
      };
    } catch (error: any) {
      console.error('[StaffManagementService] Error getting webhook URL:', {
        assigneeName,
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: 'スタッフ情報の取得に失敗しました'
      };
    }
  }

  /**
   * スタッフ管理スプレッドシートからデータを取得
   * 
   * @returns スタッフ情報の配列
   * 
   * キャッシュ機能:
   * - 60分間キャッシュ
   * - キャッシュが有効な場合は、スプレッドシートにアクセスしない
   * 
   * カラムマッピング:
   * - A列: イニシャル
   * - C列: 名前
   * - F列: Chat webhook
   */
  private async fetchStaffData(): Promise<StaffInfo[]> {
    // キャッシュが有効な場合は、キャッシュから返す
    const now = Date.now();
    if (this.cache.size > 0 && now < this.cacheExpiry) {
      console.log('[StaffManagementService] Using cached staff data');
      return Array.from(this.cache.values());
    }

    console.log('[StaffManagementService] Fetching staff data from spreadsheet');

    // GoogleSheetsClientを初期化
    const client = new GoogleSheetsClient({
      spreadsheetId: this.SPREADSHEET_ID,
      sheetName: this.SHEET_NAME,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH
    });

    // 認証
    await client.authenticate();

    // 全データを取得
    const rows = await client.readAll();

    // スタッフ情報に変換
    const staffData: StaffInfo[] = [];
    for (const row of rows) {
      // B列（イニシャル）、C列（名字）、F列（Chat webhook）を取得
      const initials = row['イニシャル'] as string;
      const name = row['名字'] as string; // 「名前」ではなく「名字」
      const chatWebhook = row['Chat webhook'] as string | null;

      // イニシャルまたは名前が存在する場合のみ追加
      if (initials || name) {
        const staff: StaffInfo = {
          initials: initials || '',
          name: name || '',
          chatWebhook: chatWebhook || null
        };
        staffData.push(staff);

        // キャッシュに追加（イニシャルと名前の両方をキーにする）
        if (initials) {
          this.cache.set(initials, staff);
        }
        if (name) {
          this.cache.set(name, staff);
        }
      }
    }

    // キャッシュの有効期限を設定
    this.cacheExpiry = now + this.CACHE_DURATION_MS;

    console.log('[StaffManagementService] Fetched staff data:', {
      count: staffData.length,
      cacheExpiry: new Date(this.cacheExpiry).toISOString()
    });

    return staffData;
  }

  /**
   * キャッシュをクリア
   * 
   * 手動同期時やテスト時に使用します。
   */
  clearCache(): void {
    console.log('[StaffManagementService] Clearing cache');
    this.cache.clear();
    this.cacheExpiry = 0;
  }
}
