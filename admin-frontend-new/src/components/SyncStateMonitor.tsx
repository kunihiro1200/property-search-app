import React, { useEffect, useState } from 'react';
import { getSyncHealth, SyncHealth } from '../services/syncStateApi';

/**
 * Real-time sync state monitor component
 * 
 * Displays current sync health status with auto-refresh
 */
export const SyncStateMonitor: React.FC = () => {
  const [health, setHealth] = useState<SyncHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      const data = await getSyncHealth();
      setHealth(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラー');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="sync-state-monitor loading">
        <div className="spinner"></div>
        <p>同期状態を読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sync-state-monitor error">
        <div className="error-icon">⚠️</div>
        <p>同期状態の取得に失敗しました</p>
        <p className="error-message">{error}</p>
        <button onClick={fetchHealth}>再試行</button>
      </div>
    );
  }

  if (!health) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return '#10b981'; // green
      case 'degraded':
        return '#f59e0b'; // yellow
      case 'unhealthy':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'degraded':
        return '⚠️';
      case 'unhealthy':
        return '❌';
      default:
        return '❓';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'healthy':
        return '正常';
      case 'degraded':
        return '低下';
      case 'unhealthy':
        return '異常';
      default:
        return '不明';
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds.toFixed(0)}秒`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds.toFixed(0)}秒`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '未実行';
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP');
  };

  return (
    <div className="sync-state-monitor">
      <div className="monitor-header">
        <h3>同期システム状態</h3>
        <button onClick={fetchHealth} className="refresh-button">
          🔄 更新
        </button>
      </div>

      <div className="status-card" style={{ borderColor: getStatusColor(health.status) }}>
        <div className="status-main">
          <span className="status-icon">{getStatusIcon(health.status)}</span>
          <div className="status-info">
            <h4>システム状態</h4>
            <p className="status-value" style={{ color: getStatusColor(health.status) }}>
              {getStatusText(health.status)}
            </p>
          </div>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">最終同期</div>
          <div className="metric-value">{formatDate(health.lastSync)}</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">エラー率</div>
          <div className="metric-value" style={{ 
            color: health.errorRate > 0.1 ? '#ef4444' : health.errorRate > 0.05 ? '#f59e0b' : '#10b981'
          }}>
            {(health.errorRate * 100).toFixed(2)}%
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">平均実行時間</div>
          <div className="metric-value">{formatDuration(health.avgSyncDuration)}</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">最近のエラー</div>
          <div className="metric-value" style={{ 
            color: health.recentErrors > 50 ? '#ef4444' : health.recentErrors > 20 ? '#f59e0b' : '#10b981'
          }}>
            {health.recentErrors}件
          </div>
        </div>
      </div>

      <style>{`
        .sync-state-monitor {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .monitor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .monitor-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .refresh-button {
          padding: 8px 16px;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .refresh-button:hover {
          background: #e5e7eb;
        }

        .status-card {
          border: 2px solid;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .status-main {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .status-icon {
          font-size: 48px;
        }

        .status-info h4 {
          margin: 0 0 8px 0;
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
        }

        .status-value {
          font-size: 24px;
          font-weight: 600;
          margin: 0;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .metric-card {
          background: #f9fafb;
          border-radius: 6px;
          padding: 16px;
        }

        .metric-label {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 8px;
          font-weight: 500;
        }

        .metric-value {
          font-size: 20px;
          font-weight: 600;
          color: #111827;
        }

        .sync-state-monitor.loading,
        .sync-state-monitor.error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          text-align: center;
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

        .error-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .error-message {
          color: #ef4444;
          font-size: 14px;
          margin: 8px 0 16px 0;
        }
      `}</style>
    </div>
  );
};
