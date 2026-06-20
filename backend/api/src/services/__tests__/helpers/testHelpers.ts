/**
 * テストヘルパー関数
 * 
 * 統合テストで使用する共通のヘルパー関数を提供します。
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * テストデータをクリーンアップする
 */
export async function cleanupTestData(
  supabase: SupabaseClient,
  syncId?: string
): Promise<void> {
  if (syncId) {
    // 同期履歴を削除
    await supabase
      .from('property_listing_sync_history')
      .delete()
      .eq('sync_id', syncId);

    // 同期状態を削除
    await supabase
      .from('property_listing_sync_states')
      .delete()
      .eq('id', syncId);
  }
}

/**
 * テスト用の物件番号を取得する
 */
export async function getTestPropertyNumbers(
  supabase: SupabaseClient,
  limit: number = 10
): Promise<string[]> {
  const { data, error } = await supabase
    .from('property_listings')
    .select('property_number')
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map(item => item.property_number);
}

/**
 * 同期状態を検証する
 */
export async function verifySyncState(
  supabase: SupabaseClient,
  syncId: string,
  expectedStatus: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('property_listing_sync_states')
    .select('*')
    .eq('id', syncId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.status === expectedStatus;
}

/**
 * 同期履歴を検証する
 */
export async function verifySyncHistory(
  supabase: SupabaseClient,
  syncId: string,
  expectedCount: number
): Promise<boolean> {
  const { data, error } = await supabase
    .from('property_listing_sync_history')
    .select('*')
    .eq('sync_id', syncId);

  if (error || !data) {
    return false;
  }

  return data.length === expectedCount;
}

/**
 * テスト環境の設定を取得する
 */
export function getTestConfig() {
  return {
    supabaseUrl: process.env.TEST_SUPABASE_URL || process.env.SUPABASE_URL!,
    supabaseServiceRoleKey: process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
    spreadsheetId: process.env.TEST_SPREADSHEET_ID || process.env.SPREADSHEET_ID!,
    sheetName: process.env.TEST_SHEET_NAME || '物件リスト',
    batchSize: 10,
    rateLimit: 5,
    concurrency: 2,
  };
}

/**
 * テストの実行時間を測定する
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const startTime = Date.now();
  const result = await fn();
  const duration = Date.now() - startTime;

  return { result, duration };
}

/**
 * リトライ付きでテストを実行する
 */
export async function retryTest<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

/**
 * テスト用のタイムアウトを設定する
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

/**
 * テスト結果をログに出力する
 */
export function logTestResult(
  testName: string,
  success: boolean,
  details?: any
): void {
  const icon = success ? '✅' : '❌';
  console.log(`${icon} ${testName}`);
  if (details) {
    console.log('  詳細:', JSON.stringify(details, null, 2));
  }
}

/**
 * テストデータの統計情報を取得する
 */
export async function getTestDataStats(
  supabase: SupabaseClient
): Promise<{
  totalProperties: number;
  totalSyncStates: number;
  totalSyncHistory: number;
}> {
  const [properties, syncStates, syncHistory] = await Promise.all([
    supabase.from('property_listings').select('id', { count: 'exact', head: true }),
    supabase.from('property_listing_sync_states').select('id', { count: 'exact', head: true }),
    supabase.from('property_listing_sync_history').select('id', { count: 'exact', head: true }),
  ]);

  return {
    totalProperties: properties.count || 0,
    totalSyncStates: syncStates.count || 0,
    totalSyncHistory: syncHistory.count || 0,
  };
}
