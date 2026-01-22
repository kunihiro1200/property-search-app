import { InquirySyncService } from '../services/InquirySyncService';

/**
 * 問い合わせ同期ジョブ
 * 
 * 定期的に未同期の問い合わせを買主リストに転記します。
 */
export class InquirySyncJob {
  private inquirySyncService: InquirySyncService;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor() {
    this.inquirySyncService = new InquirySyncService({
      spreadsheetId: process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
      maxRetries: 3,
      retryDelayMs: 1000, // 1秒
    });
  }

  /**
   * ジョブを開始する
   * 
   * @param intervalMinutes - 実行間隔（分）デフォルト: 5分
   */
  async start(intervalMinutes: number = 5): Promise<void> {
    console.log(`[InquirySyncJob] ジョブを開始します（実行間隔: ${intervalMinutes}分）`);

    // 認証を実行
    try {
      await this.inquirySyncService.authenticate();
      console.log('[InquirySyncJob] 認証が完了しました');
    } catch (error) {
      console.error('[InquirySyncJob] 認証エラー:', error);
      throw error;
    }

    // 初回実行
    await this.run();

    // 定期実行を設定
    const intervalMs = intervalMinutes * 60 * 1000;
    this.intervalId = setInterval(() => {
      this.run();
    }, intervalMs);

    console.log(`[InquirySyncJob] ジョブが開始されました`);
  }

  /**
   * ジョブを停止する
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[InquirySyncJob] ジョブが停止されました');
    }
  }

  /**
   * ジョブを実行する
   */
  private async run(): Promise<void> {
    if (this.isRunning) {
      console.log('[InquirySyncJob] 前回の実行がまだ完了していません。スキップします。');
      return;
    }

    this.isRunning = true;

    try {
      console.log('[InquirySyncJob] 未同期問い合わせの処理を開始します');
      const startTime = Date.now();

      await this.inquirySyncService.syncPendingInquiries();

      const duration = Date.now() - startTime;
      console.log(`[InquirySyncJob] 処理が完了しました（所要時間: ${duration}ms）`);

    } catch (error) {
      console.error('[InquirySyncJob] ジョブ実行中にエラーが発生しました:', error);
    } finally {
      this.isRunning = false;
    }
  }
}

// シングルトンインスタンス
let inquirySyncJobInstance: InquirySyncJob | null = null;

/**
 * 問い合わせ同期ジョブのインスタンスを取得する
 */
export function getInquirySyncJob(): InquirySyncJob {
  if (!inquirySyncJobInstance) {
    inquirySyncJobInstance = new InquirySyncJob();
  }
  return inquirySyncJobInstance;
}
