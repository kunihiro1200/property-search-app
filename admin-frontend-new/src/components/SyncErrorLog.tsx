import React, { useState } from 'react';
import { SyncError } from '../services/syncStateApi';

interface SyncErrorLogProps {
  errors: SyncError[];
  loading?: boolean;
}

/**
 * Sync error log component with filtering
 * 
 * Displays sync errors with filtering by error type
 */
export const SyncErrorLog: React.FC<SyncErrorLogProps> = ({ errors, loading = false }) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (loading) {
    return (
      <div className="sync-error-log loading">
        <div className="spinner"></div>
        <p>エラーログを読み込み中...</p>
      </div>
    );
  }

  if (errors.length === 0) {
    return (
      <div className="sync-error-log empty">
        <div className="empty-icon">✅</div>
        <p>エラーはありません</p>
      </div>
    );
  }

  // Get unique error types
  const errorTypes = Array.from(new Set(errors.map(e => e.error_type)));

  // Filter errors
  const filteredErrors = errors.filter(error => {
    const matchesType = filterType === 'all' || error.error_type === filterType;
    const matchesSearch = searchQuery === '' || 
      error.property_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      error.error_message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getErrorTypeColor = (type: string) => {
    switch (type) {
      case 'validation':
        return '#f59e0b'; // yellow
      case 'network':
        return '#ef4444'; // red
      case 'database':
        return '#dc2626'; // dark red
      case 'rate_limit':
        return '#f97316'; // orange
      case 'permission':
        return '#7c3aed'; // purple
      default:
        return '#6b7280'; // gray
    }
  };

  const getErrorTypeLabel = (type: string) => {
    switch (type) {
      case 'validation':
        return 'バリデーション';
      case 'network':
        return 'ネットワーク';
      case 'database':
        return 'データベース';
      case 'rate_limit':
        return 'レート制限';
      case 'permission':
        return '権限';
      default:
        return '不明';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP');
  };

  return (
    <div className="sync-error-log">
      <div className="error-log-header">
        <h3>エラーログ ({filteredErrors.length}件)</h3>
        
        <div className="filters">
          <input
            type="text"
            placeholder="物件番号またはエラーメッセージで検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="all">すべてのエラー</option>
            {errorTypes.map(type => (
              <option key={type} value={type}>
                {getErrorTypeLabel(type)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="error-list">
        {filteredErrors.map((error) => (
          <div key={error.id} className="error-item">
            <div className="error-header">
              <span 
                className="error-type-badge"
                style={{ backgroundColor: getErrorTypeColor(error.error_type) }}
              >
                {getErrorTypeLabel(error.error_type)}
              </span>
              <span className="property-number">{error.property_number}</span>
              {error.retry_count > 0 && (
                <span className="retry-badge">
                  🔄 {error.retry_count}回リトライ
                </span>
              )}
            </div>
            
            <div className="error-message">{error.error_message}</div>
            
            <div className="error-footer">
              <span className="error-time">{formatDate(error.created_at)}</span>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .sync-error-log {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .error-log-header {
          margin-bottom: 20px;
        }

        .error-log-header h3 {
          margin: 0 0 16px 0;
          font-size: 18px;
          font-weight: 600;
        }

        .filters {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .search-input {
          flex: 1;
          min-width: 200px;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
        }

        .search-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .filter-select {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          background: white;
          cursor: pointer;
        }

        .filter-select:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .error-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 600px;
          overflow-y: auto;
        }

        .error-item {
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 16px;
          transition: all 0.2s;
        }

        .error-item:hover {
          border-color: #d1d5db;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .error-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .error-type-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          color: white;
        }

        .property-number {
          font-weight: 600;
          color: #111827;
        }

        .retry-badge {
          padding: 4px 8px;
          background: #fef3c7;
          color: #92400e;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .error-message {
          color: #374151;
          font-size: 14px;
          line-height: 1.5;
          margin-bottom: 12px;
          word-break: break-word;
        }

        .error-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .error-time {
          font-size: 12px;
          color: #6b7280;
        }

        .sync-error-log.loading,
        .sync-error-log.empty {
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

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
      `}</style>
    </div>
  );
};
