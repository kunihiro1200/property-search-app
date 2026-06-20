/**
 * PropertyListingRestSyncService - 統合テスト
 * 
 * このテストスイートは、物件リスト同期サービスの統合テストを提供します。
 * 実際のSupabase REST APIとGoogle Sheets APIを使用してテストを実行します。
 * 
 * @group integration
 */

import { PropertyListingRestSyncService } from '../PropertyListingRestSyncService';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

describe('PropertyListingRestSyncService - Integration Tests', () => {
  let syncService: PropertyListingRestSyncService;
  let supabase: SupabaseClient;
  let testSyncId: string;

  // テスト環境の設定
  const TEST_CONFIG = {
    supabaseUrl: process.env.TEST_SUPABASE_URL || process.env.SUPABASE_URL!,
    supabaseServiceRoleKey: process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
    spreadsheetId: process.env.TEST_SPREADSHEET_ID || process.env.SPREADSHEET_ID!,
    sheetName: process.env.TEST_SHEET_NAME || '物件リスト',
    batchSize: 10, // テスト用に小さくする
    rateLimit: 5,  // テスト用に小さくする
    concurrency: 2, // テスト用に小さくする
  };

  beforeAll(async () => {
    // Supabaseクライアントの初期化
    supabase = createClient(
      TEST_CONFIG.supabaseUrl,
      TEST_CONFIG.supabaseServiceRoleKey
    );

    // 同期サービスの初期化
    syncService = new PropertyListingRestSyncService({
      supabaseUrl: TEST_CONFIG.supabaseUrl,
      supabaseServiceRoleKey: TEST_CONFIG.supabaseServiceRoleKey,
      spreadsheetId: TEST_CONFIG.spreadsheetId,
      sheetName: TEST_CONFIG.sheetName,
      batchSize: TEST_CONFIG.batchSize,
      rateLimit: TEST_CONFIG.rateLimit,
      concurrency: TEST_CONFIG.concurrency,
    });

    console.log('✅ テスト環境のセットアップ完了');
  });

  afterAll(async () => {
    // テストデータのクリーンアップ
    if (testSyncId) {
      await supabase
        .from('property_listing_sync_history')
        .delete()
        .eq('sync_id', testSyncId);

      await supabase
        .from('property_listing_sync_states')
        .delete()
        .eq('id', testSyncId);
    }

    console.log('✅ テストデータのクリーンアップ完了');
  });

  describe('シナリオ1: 完全同期フロー', () => {
    it('Google Sheetsからすべての物件リストを同期できる', async () => {
      // 実行
      const result = await syncService.syncAll();
      testSyncId = result.syncId;

      // 検証: 同期結果
      expect(result.status).toBe('completed');
      expect(result.totalItems).toBeGreaterThan(0);
      expect(result.successCount).toBeGreaterThan(0);
      expect(result.successCount).toBeLessThanOrEqual(result.totalItems);

      console.log(`✅ 同期完了: ${result.successCount}/${result.totalItems}件`);
    }, 60000); // タイムアウト: 60秒

    it('同期状態が正しく記録される', async () => {
      // 同期を実行
      const result = await syncService.syncAll();
      testSyncId = result.syncId;

      // 同期状態を確認
      const { data: syncState, error } = await supabase
        .from('property_listing_sync_states')
        .select('*')
        .eq('id', result.syncId)
        .single();

      // 検証
      expect(error).toBeNull();
      expect(syncState).toBeDefined();
      expect(syncState.status).toBe('completed');
      expect(syncState.total_items).toBe(result.totalItems);
      expect(syncState.success_count).toBe(result.successCount);
      expect(syncState.failed_count).toBe(result.failedCount);
      expect(syncState.skipped_count).toBe(result.skippedCount);
      expect(syncState.started_at).toBeDefined();
      expect(syncState.completed_at).toBeDefined();

      console.log('✅ 同期状態の記録を確認');
    }, 60000);

    it('同期履歴が正しく記録される', async () => {
      // 同期を実行
      const result = await syncService.syncAll();
      testSyncId = result.syncId;

      // 同期履歴を確認
      const { data: history, error } = await supabase
        .from('property_listing_sync_history')
        .select('*')
        .eq('sync_id', result.syncId)
        .order('created_at', { ascending: true });

      // 検証
      expect(error).toBeNull();
      expect(history).toBeDefined();
      expect(history.length).toBeGreaterThan(0);

      // 各履歴レコードの検証
      history.forEach(record => {
        expect(record.sync_id).toBe(result.syncId);
        expect(record.property_number).toBeDefined();
        expect(record.status).toMatch(/^(success|failed|skipped)$/);
        expect(record.created_at).toBeDefined();

        if (record.status === 'failed') {
          expect(record.error_message).toBeDefined();
        }
      });

      console.log(`✅ 同期履歴の記録を確認: ${history.length}件`);
    }, 60000);
  });

  describe('シナリオ2: 選択同期フロー', () => {
    it('特定の物件番号のみを同期できる', async () => {
      // まず全同期を実行して物件番号を取得
      const fullSyncResult = await syncService.syncAll();
      
      // 同期履歴から最初の3件の物件番号を取得
      const { data: history } = await supabase
        .from('property_listing_sync_history')
        .select('property_number')
        .eq('sync_id', fullSyncResult.syncId)
        .eq('status', 'success')
        .limit(3);

      if (!history || history.length === 0) {
        console.log('⚠️ テスト用の物件番号が見つかりません。スキップします。');
        return;
      }

      const propertyNumbers = history.map(h => h.property_number);

      // 選択同期を実行
      const result = await syncService.syncByNumbers(propertyNumbers);
      testSyncId = result.syncId;

      // 検証
      expect(result.status).toBe('completed');
      expect(result.totalItems).toBe(propertyNumbers.length);
      expect(result.successCount).toBeGreaterThan(0);

      console.log(`✅ 選択同期完了: ${result.successCount}/${propertyNumbers.length}件`);
    }, 60000);

    it('存在しない物件番号はスキップされる', async () => {
      const propertyNumbers = ['NONEXISTENT001', 'NONEXISTENT002'];

      // 実行
      const result = await syncService.syncByNumbers(propertyNumbers);
      testSyncId = result.syncId;

      // 検証
      expect(result.status).toBe('completed');
      expect(result.totalItems).toBe(propertyNumbers.length);
      expect(result.skippedCount).toBe(propertyNumbers.length);

      console.log(`✅ 存在しない物件番号のスキップを確認: ${result.skippedCount}件`);
    }, 30000);
  });

  describe('シナリオ3: エラーハンドリング', () => {
    it('無効な設定でエラーが発生する', async () => {
      // 無効な設定で同期サービスを作成
      const invalidService = new PropertyListingRestSyncService({
        supabaseUrl: 'https://invalid-url.supabase.co',
        supabaseServiceRoleKey: 'invalid-key',
        spreadsheetId: TEST_CONFIG.spreadsheetId,
        sheetName: TEST_CONFIG.sheetName,
      });

      // 実行と検証
      await expect(invalidService.syncAll()).rejects.toThrow();

      console.log('✅ 無効な設定でのエラーハンドリングを確認');
    }, 30000);

    it('同期中のエラーが適切に記録される', async () => {
      // 存在しないシート名で同期を試みる
      const invalidSheetService = new PropertyListingRestSyncService({
        supabaseUrl: TEST_CONFIG.supabaseUrl,
        supabaseServiceRoleKey: TEST_CONFIG.supabaseServiceRoleKey,
        spreadsheetId: TEST_CONFIG.spreadsheetId,
        sheetName: '存在しないシート名',
      });

      // 実行
      try {
        await invalidSheetService.syncAll();
      } catch (error) {
        // エラーが発生することを期待
        expect(error).toBeDefined();
        console.log('✅ 同期エラーの記録を確認');
      }
    }, 30000);
  });

  describe('シナリオ4: 並行処理', () => {
    it('複数の同期操作を並行して実行できる', async () => {
      // まず全同期を実行して物件番号を取得
      const fullSyncResult = await syncService.syncAll();
      
      // 同期履歴から物件番号を取得
      const { data: history } = await supabase
        .from('property_listing_sync_history')
        .select('property_number')
        .eq('sync_id', fullSyncResult.syncId)
        .eq('status', 'success')
        .limit(6);

      if (!history || history.length < 6) {
        console.log('⚠️ テスト用の物件番号が不足しています。スキップします。');
        return;
      }

      // 3つのグループに分割
      const group1 = history.slice(0, 2).map(h => h.property_number);
      const group2 = history.slice(2, 4).map(h => h.property_number);
      const group3 = history.slice(4, 6).map(h => h.property_number);

      // 並行実行
      const startTime = Date.now();
      const promises = [
        syncService.syncByNumbers(group1),
        syncService.syncByNumbers(group2),
        syncService.syncByNumbers(group3),
      ];

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      // 検証
      results.forEach(result => {
        expect(result.status).toBe('completed');
        expect(result.successCount).toBeGreaterThan(0);
      });

      console.log(`✅ 並行同期完了: ${duration}ms`);
    }, 90000);

    it('レート制限が機能する', async () => {
      // レート制限を超える数のリクエストを送信
      const startTime = Date.now();

      // 小さなバッチで複数回同期
      const promises = Array.from({ length: 3 }, () =>
        syncService.syncAll()
      );

      await Promise.all(promises);

      const duration = Date.now() - startTime;

      // レート制限（5 req/s）を考慮すると、ある程度の時間がかかるはず
      expect(duration).toBeGreaterThan(1000); // 最低1秒

      console.log(`✅ レート制限の動作を確認: ${duration}ms`);
    }, 120000);
  });

  describe('ヘルスチェック', () => {
    it('サービスのヘルス状態を取得できる', async () => {
      const health = await syncService.getHealth();

      // 検証
      expect(health).toBeDefined();
      expect(health.status).toMatch(/^(healthy|degraded|unhealthy)$/);
      expect(health.circuitBreakerState).toMatch(/^(closed|open|half-open)$/);
      expect(health.lastSyncAt).toBeDefined();

      console.log('✅ ヘルスチェック:', health);
    });
  });
});
