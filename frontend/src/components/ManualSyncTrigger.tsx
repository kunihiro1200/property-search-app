import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface SyncProgress {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  percentage: number;
  currentSellerId?: string;
}

export const ManualSyncTrigger: React.FC = () => {
  const [mode, setMode] = useState<'full' | 'incremental'>('incremental');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const checkProgress = async () => {
    try {
      const response = await api.get('/sync/manual/progress');
      if (response.data.success) {
        setIsRunning(response.data.data.isRunning);
        setProgress(response.data.data.progress);
      }
    } catch (err: any) {
      console.error('Failed to check progress:', err);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning) {
      interval = setInterval(checkProgress, 2000); // 2秒ごとに進行状況を確認
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  const startSync = async () => {
    try {
      setError(null);
      setResult(null);
      
      const response = await api.post('/sync/manual', { mode });
      
      if (response.data.success) {
        setIsRunning(true);
        // 進行状況の監視を開始
        checkProgress();
      } else {
        setError(response.data.error || '同期の開始に失敗しました');
      }
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError('同期が既に実行中です');
        setIsRunning(true);
        checkProgress();
      } else {
        setError(err.message || '同期の開始に失敗しました');
      }
    }
  };

  useEffect(() => {
    // 進行状況が完了したら結果を表示
    if (progress && progress.processed === progress.total && isRunning) {
      setIsRunning(false);
      setResult({
        totalRows: progress.total,
        successCount: progress.succeeded,
        failureCount: progress.failed,
      });
    }
  }, [progress, isRunning]);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">手動同期</h3>

      {/* モード選択 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          同期モード
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              value="incremental"
              checked={mode === 'incremental'}
              onChange={(e) => setMode(e.target.value as 'incremental')}
              disabled={isRunning}
              className="mr-2"
            />
            <span>差分同期（未同期データのみ）</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="full"
              checked={mode === 'full'}
              onChange={(e) => setMode(e.target.value as 'full')}
              disabled={isRunning}
              className="mr-2"
            />
            <span>全データ同期</span>
          </label>
        </div>
      </div>

      {/* 実行ボタン */}
      <button
        onClick={startSync}
        disabled={isRunning}
        className={`w-full py-2 px-4 rounded font-semibold ${
          isRunning
            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {isRunning ? '同期実行中...' : '同期を開始'}
      </button>

      {/* エラー表示 */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* 進行状況表示 */}
      {isRunning && progress && (
        <div className="mt-4 space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>進行状況</span>
              <span>{progress.percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-gray-600">処理済</p>
              <p className="font-semibold">{progress.processed} / {progress.total}</p>
            </div>
            <div>
              <p className="text-gray-600">成功</p>
              <p className="font-semibold text-green-600">{progress.succeeded}</p>
            </div>
            <div>
              <p className="text-gray-600">失敗</p>
              <p className="font-semibold text-red-600">{progress.failed}</p>
            </div>
          </div>
        </div>
      )}

      {/* 結果表示 */}
      {result && !isRunning && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
          <h4 className="font-semibold text-green-800 mb-2">同期完了</h4>
          <div className="space-y-1 text-sm">
            <p>総件数: {result.totalRows}</p>
            <p className="text-green-600">成功: {result.successCount}</p>
            {result.failureCount > 0 && (
              <p className="text-red-600">失敗: {result.failureCount}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
