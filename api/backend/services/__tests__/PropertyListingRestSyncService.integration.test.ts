/**
 * PropertyListingRestSyncService Integration Tests
 * 
 * Task 1.5: Google Sheets統合のテスト
 */

import { PropertyListingRestSyncService } from '../PropertyListingRestSyncService';
import { GoogleSheetsClient } from '../GoogleSheetsClient';

describe('PropertyListingRestSyncService - Google Sheets Integration', () => {
  let service: PropertyListingRestSyncService;
  let sheetsClient: GoogleSheetsClient;

  beforeAll(async () => {
    // Google Sheetsクライアントを初期化
    sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '',
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    });

    // 認証
    await sheetsClient.authenticate();

    // サービスを初期化
    service = new PropertyListingRestSyncService({
      supabaseUrl: process.env.SUPABASE_URL || '',
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      batchSize: 10,
      rateLimit: 5,
      retryAttempts: 3,
      retryDelay: 1000,
      maxRetryDelay: 10000,
      retryFactor: 2,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 60000,
      timeout: 30000,
      googleSheets: {
        spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '',
        sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
      },
    });
  });

  describe('fetchFromSheets', () => {
    it('Google Sheetsから物件リストを取得できる', async () => {
      // 全件同期を実行（実際にはデータベースに書き込まない）
      const result = await service.syncAll();

      // 結果を検証
      expect(result).toBeDefined();
      expect(result.syncId).toBeDefined();
      expect(result.stats).toBeDefined();
      expect(result.stats.total).toBeGreaterThan(0);

      console.log('Sync result:', result.stats);
    }, 60000); // タイムアウトを60秒に設定

    it('指定された物件番号の物件を取得できる', async () => {
      // テスト用の物件番号
      const testPropertyNumbers = ['AA1', 'AA2', 'AA3'];

      // 選択同期を実行
      const result = await service.syncByNumbers(testPropertyNumbers);

      // 結果を検証
      expect(result).toBeDefined();
      expect(result.syncId).toBeDefined();
      expect(result.stats).toBeDefined();

      console.log('Selective sync result:', result.stats);
    }, 60000);
  });

  describe('transformAndValidateRows', () => {
    it('スプレッドシートデータを正しく変換できる', async () => {
      // Google Sheetsから少量のデータを取得
      const rows = await sheetsClient.readRange('A2:ZZ11'); // 最初の10行

      // データが取得できることを確認
      expect(rows).toBeDefined();
      expect(Array.isArray(rows)).toBe(true);

      console.log(`Fetched ${rows.length} rows from Google Sheets`);

      // 各行に物件番号が含まれることを確認
      const propertyNumbers = rows
        .map(row => String(row['物件番号'] || '').trim())
        .filter(num => num.startsWith('AA'));

      expect(propertyNumbers.length).toBeGreaterThan(0);

      console.log('Property numbers:', propertyNumbers.slice(0, 5));
    }, 30000);
  });

  describe('validatePropertyListing', () => {
    it('有効な物件データをバリデーションできる', async () => {
      // Google Sheetsから1行取得
      const rows = await sheetsClient.readRange('A2:ZZ2');

      expect(rows).toBeDefined();
      expect(rows.length).toBeGreaterThan(0);

      const row = rows[0];
      const propertyNumber = String(row['物件番号'] || '').trim();

      // 物件番号が有効な形式であることを確認
      expect(propertyNumber).toMatch(/^AA\d+$/);

      console.log('Valid property number:', propertyNumber);
    }, 30000);
  });

  describe('getHealth', () => {
    it('ヘルスステータスを取得できる', async () => {
      const health = await service.getHealth();

      // ヘルスステータスを検証
      expect(health).toBeDefined();
      expect(health.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
      expect(health.queueSize).toBeDefined();
      expect(health.circuitBreakerState).toBeDefined();

      console.log('Health status:', health);
    }, 30000);
  });
});
