import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface SyncStats {
  totalSyncs: number;
  successCount: number;
  failureCount: number;
  averageDuration: number;
  errorsByType: Record<string, number>;
}

interface RateLimitUsage {
  available: number;
  capacity: number;
  usagePercentage: number;
  isNearLimit: boolean;
  warning: string | null;
}

interface SyncLog {
  id: string;
  sync_type: string;
  status: string;
  rows_affected: number;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  error_message?: string;
}

export const SpreadsheetSyncStatus: React.FC = () => {
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [rateLimitUsage, setRateLimitUsage] = useState<RateLimitUsage | null>(null);
  const [recentLogs, setRecentLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sync/status');
      
      if (response.data.success) {
        setStats(response.data.data.stats);
        setRateLimitUsage(response.data.data.rateLimitUsage);
        setRecentLogs(response.data.data.recentLogs);
        setError(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sync status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // 30秒ごとに更新
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return <div className="p-4">読み込み中...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-600">エラー: {error}</p>
        <button
          onClick={fetchStatus}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          再試行
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* レート制限状況 */}
      {rateLimitUsage && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3">API レート制限</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span>使用状況:</span>
              <span className={rateLimitUsage.isNearLimit ? 'text-orange-600 font-semibold' : ''}>
                {rateLimitUsage.available} / {rateLimitUsage.capacity} 利用可能
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  rateLimitUsage.usagePercentage > 80
                    ? 'bg-red-500'
                    : rateLimitUsage.usagePercentage > 50
                    ? 'bg-orange-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${100 - rateLimitUsage.usagePercentage}%` }}
              />
            </div>
            {rateLimitUsage.warning && (
              <p className="text-sm text-orange-600">{rateLimitUsage.warning}</p>
            )}
          </div>
        </div>
      )}

      {/* 同期統計 */}
      {stats && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3">同期統計（過去7日間）</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">総同期数</p>
              <p className="text-2xl font-bold">{stats.totalSyncs}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">成功</p>
              <p className="text-2xl font-bold text-green-600">{stats.successCount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">失敗</p>
              <p className="text-2xl font-bold text-red-600">{stats.failureCount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">平均処理時間</p>
              <p className="text-2xl font-bold">{Math.round(stats.averageDuration)}ms</p>
            </div>
          </div>

          {/* エラータイプ別統計 */}
          {Object.keys(stats.errorsByType).some(key => stats.errorsByType[key] > 0) && (
            <div className="mt-4">
              <p className="text-sm font-semibold mb-2">エラータイプ別:</p>
              <div className="space-y-1">
                {Object.entries(stats.errorsByType).map(([type, count]) => (
                  count > 0 && (
                    <div key={type} className="flex justify-between text-sm">
                      <span className="text-gray-600">{type}:</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 最近の同期ログ */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">最近の同期</h3>
          <button
            onClick={fetchStatus}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            更新
          </button>
        </div>
        <div className="space-y-2">
          {recentLogs.length === 0 ? (
            <p className="text-gray-500 text-sm">同期履歴がありません</p>
          ) : (
            recentLogs.map(log => (
              <div
                key={log.id}
                className="border-l-4 pl-3 py-2 text-sm"
                style={{
                  borderColor: log.status === 'success' ? '#10b981' : log.status === 'failure' ? '#ef4444' : '#6b7280'
                }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-semibold">{log.sync_type}</span>
                    <span className="mx-2">•</span>
                    <span className={
                      log.status === 'success' ? 'text-green-600' :
                      log.status === 'failure' ? 'text-red-600' :
                      'text-gray-600'
                    }>
                      {log.status}
                    </span>
                  </div>
                  <span className="text-gray-500 text-xs">
                    {new Date(log.started_at).toLocaleString('ja-JP')}
                  </span>
                </div>
                <div className="mt-1 text-gray-600">
                  {log.rows_affected} 件処理
                  {log.duration_ms && ` • ${log.duration_ms}ms`}
                </div>
                {log.error_message && (
                  <div className="mt-1 text-red-600 text-xs">
                    {log.error_message}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
