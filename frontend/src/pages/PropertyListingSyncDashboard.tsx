import React, { useEffect, useState } from 'react';
import { SyncStateMonitor } from '../components/SyncStateMonitor';
import { SyncErrorLog } from '../components/SyncErrorLog';
import {
  triggerManualSync,
  getSyncHistory,
  getSyncStatistics,
  getSyncErrors,
  SyncRecord,
  SyncStatistics,
  SyncError
} from '../services/syncStateApi';

/**
 * Property Listing Sync Dashboard
 * 
 * Main dashboard for monitoring and managing property listing synchronization
 */
export const PropertyListingSyncDashboard: React.FC = () => {
  const [history, setHistory] = useState<SyncRecord[]>([]);
  const [statistics, setStatistics] = useState<SyncStatistics | null>(null);
  const [selectedSyncErrors, setSelectedSyncErrors] = useState<SyncError[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [historyData, statsData] = await Promise.all([
        getSyncHistory(20),
        getSyncStatistics()
      ]);
      setHistory(historyData.syncs);
      setStatistics(statsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラー');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchData, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    if (syncing) return;
    
    try {
      setSyncing(true);
      const result = await triggerManualSync();
      alert(`同期を開始しました\n同期ID: ${result.syncId}`);
      
      // Refresh data after a short delay
      setTimeout(fetchData, 2000);
    } catch (err) {
      alert(`同期の開始に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleViewErrors = async (syncId: string) => {
    try {
      const result = await getSyncErrors(syncId);
      setSelectedSyncErrors(result.errors);
    } catch (err) {
      alert(`エラーログの取得に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'in_progress':
        return '#3b82f6';
      case 'queued':
        return '#6b7280';
      case 'partial':
        return '#f59e0b';
      case 'failed':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '完了';
      case 'in_progress':
        return '実行中';
      case 'queued':
        return '待機中';
      case 'partial':
        return '部分完了';
      case 'failed':
        return '失敗';
      default:
        return '不明';
    }
  };

  const getSyncTypeText = (type: string) => {
    switch (type) {
      case 'full':
        return '全件同期';
      case 'selective':
        return '選択同期';
      case 'manual':
        return '手動同期';
      case 'scheduled':
        return '定期同期';
      default:
        return '不明';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP');
  };

  const formatDuration = (startedAt: string, completedAt?: string) => {
    if (!completedAt) return '-';
    const start = new Date(startedAt).getTime();
    const end = new Date(completedAt).getTime();
    const seconds = (end - start) / 1000;
    
    if (seconds < 60) {
      return `${seconds.toFixed(0)}秒`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds.toFixed(0)}秒`;
  };

  return (
    <div className="sync-dashboard">
      <div className="dashboard-header">
        <h1>物件リスト同期ダッシュボード</h1>
        <button 
          onClick={handleManualSync}
          disabled={syncing}
          className="sync-button"
        >
          {syncing ? '同期中...' : '🔄 手動同期を実行'}
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={fetchData}>再試行</button>
        </div>
      )}

      <div className="dashboard-grid">
        {/* Health Monitor */}
        <div className="grid-item full-width">
          <SyncStateMonitor />
        </div>

        {/* Statistics */}
        {statistics && (
          <div className="grid-item">
            <div className="stats-card">
              <h3>統計情報（過去24時間）</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-label">総同期回数</div>
                  <div className="stat-value">{statistics.totalSyncs}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">成功</div>
                  <div className="stat-value success">{statistics.successfulSyncs}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">失敗</div>
                  <div className="stat-value error">{statistics.failedSyncs}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">部分完了</div>
                  <div className="stat-value warning">{statistics.partialSyncs}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sync History */}
        <div className="grid-item">
          <div className="history-card">
            <h3>同期履歴</h3>
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>読み込み中...</p>
              </div>
            ) : (
              <div className="history-list">
                {history.map((sync) => (
                  <div key={sync.id} className="history-item">
                    <div className="history-header">
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(sync.status) }}
                      >
                        {getStatusText(sync.status)}
                      </span>
                      <span className="sync-type">{getSyncTypeText(sync.sync_type)}</span>
                    </div>
                    
                    <div className="history-details">
                      <div className="detail-row">
                        <span className="detail-label">開始:</span>
                        <span className="detail-value">{formatDate(sync.started_at)}</span>
                      </div>
                      {sync.completed_at && (
                        <div className="detail-row">
                          <span className="detail-label">実行時間:</span>
                          <span className="detail-value">
                            {formatDuration(sync.started_at, sync.completed_at)}
                          </span>
                        </div>
                      )}
                      <div className="detail-row">
                        <span className="detail-label">結果:</span>
                        <span className="detail-value">
                          成功: {sync.success_count} / 
                          失敗: {sync.failed_count} / 
                          スキップ: {sync.skipped_count}
                        </span>
                      </div>
                    </div>
                    
                    {sync.failed_count > 0 && (
                      <button 
                        onClick={() => handleViewErrors(sync.id)}
                        className="view-errors-button"
                      >
                        エラーを表示 ({sync.failed_count}件)
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Error Log */}
        {selectedSyncErrors.length > 0 && (
          <div className="grid-item full-width">
            <SyncErrorLog errors={selectedSyncErrors} />
          </div>
        )}
      </div>

      <style>{`
        .sync-dashboard {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .dashboard-header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
          color: #111827;
        }

        .sync-button {
          padding: 12px 24px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .sync-button:hover:not(:disabled) {
          background: #2563eb;
        }

        .sync-button:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .error-banner {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .error-banner span {
          color: #991b1b;
        }

        .error-banner button {
          padding: 8px 16px;
          background: white;
          border: 1px solid #fecaca;
          border-radius: 4px;
          cursor: pointer;
          color: #991b1b;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
          gap: 24px;
        }

        .grid-item {
          min-width: 0;
        }

        .grid-item.full-width {
          grid-column: 1 / -1;
        }

        .stats-card,
        .history-card {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .stats-card h3,
        .history-card h3 {
          margin: 0 0 20px 0;
          font-size: 18px;
          font-weight: 600;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .stat-item {
          background: #f9fafb;
          border-radius: 6px;
          padding: 16px;
          text-align: center;
        }

        .stat-label {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 600;
          color: #111827;
        }

        .stat-value.success {
          color: #10b981;
        }

        .stat-value.error {
          color: #ef4444;
        }

        .stat-value.warning {
          color: #f59e0b;
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 600px;
          overflow-y: auto;
        }

        .history-item {
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 16px;
        }

        .history-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          color: white;
        }

        .sync-type {
          font-size: 14px;
          color: #6b7280;
        }

        .history-details {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 12px;
        }

        .detail-row {
          display: flex;
          gap: 8px;
          font-size: 14px;
        }

        .detail-label {
          color: #6b7280;
          font-weight: 500;
        }

        .detail-value {
          color: #111827;
        }

        .view-errors-button {
          width: 100%;
          padding: 8px;
          background: #fef3c7;
          border: 1px solid #fde68a;
          border-radius: 4px;
          color: #92400e;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .view-errors-button:hover {
          background: #fde68a;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f4f6;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
