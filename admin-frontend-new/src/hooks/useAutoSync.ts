import { useEffect, useCallback, useRef, useState } from 'react';
import api from '../services/api';

interface FreshnessStatus {
  isStale: boolean;
  lastUpdateTime: string | null;
  ageMinutes: number | null;
  thresholdMinutes: number;
}

interface AutoSyncOptions {
  enabled?: boolean;
  thresholdMinutes?: number;
  onSyncStart?: () => void;
  onSyncComplete?: (result: { hasChanges: boolean; recordsAdded: number; recordsUpdated: number; recordsDeleted: number }) => void;
  onSyncError?: (error: Error) => void;
}

/**
 * 自動同期フック
 * ページロード時にキャッシュの鮮度をチェックし、必要に応じて自動同期を実行
 */
export const useAutoSync = (options: AutoSyncOptions = {}) => {
  const {
    enabled = true,
    thresholdMinutes = 5,
    onSyncStart,
    onSyncComplete,
    onSyncError,
  } = options;

  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);

  const checkAndSync = useCallback(async () => {
    if (!enabled || isSyncingRef.current) {
      return;
    }

    try {
      // 鮮度をチェック
      const freshnessResponse = await api.get<FreshnessStatus>(
        `/api/sync/freshness?thresholdMinutes=${thresholdMinutes}`
      );

      const { isStale } = freshnessResponse.data;

      // キャッシュが新鮮な場合はスキップ
      if (!isStale) {
        return;
      }

      // 同期を開始
      isSyncingRef.current = true;
      setIsSyncing(true);
      onSyncStart?.();

      // バックグラウンドで同期を実行
      const syncResponse = await api.post('/api/sync/manual');

      const hasChanges = 
        syncResponse.data.recordsAdded > 0 ||
        syncResponse.data.recordsUpdated > 0 ||
        syncResponse.data.recordsDeleted > 0;

      onSyncComplete?.({
        hasChanges,
        recordsAdded: syncResponse.data.recordsAdded,
        recordsUpdated: syncResponse.data.recordsUpdated,
        recordsDeleted: syncResponse.data.recordsDeleted,
      });
    } catch (error) {
      console.error('Auto sync error:', error);
      onSyncError?.(error as Error);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [enabled, thresholdMinutes, onSyncStart, onSyncComplete, onSyncError]);

  useEffect(() => {
    if (enabled) {
      // ページロード時に自動同期をチェック
      checkAndSync();
    }
  }, [enabled, checkAndSync]);

  return {
    isSyncing,
    checkAndSync,
  };
};
