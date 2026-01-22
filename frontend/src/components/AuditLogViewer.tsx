import React, { useState, useEffect } from 'react';

export interface AuditLogEntry {
  id: string;
  entity_type: 'buyer' | 'seller' | 'property';
  entity_id: string;
  field_name: string;
  old_value: any;
  new_value: any;
  user_id: string;
  user_email: string;
  timestamp: string;
  action: 'update' | 'create' | 'delete';
}

interface AuditLogViewerProps {
  entityType: 'buyer' | 'seller' | 'property';
  entityId: string;
  fieldName?: string;
  limit?: number;
}

/**
 * Audit Log Viewer Component
 * 
 * Displays audit trail for entity changes
 */
export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({
  entityType,
  entityId,
  fieldName,
  limit = 20,
}) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAuditLogs();
  }, [entityType, entityId, fieldName, limit]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      let url = `/api/audit-logs/entity/${entityType}/${entityId}?limit=${limit}`;
      
      if (fieldName) {
        url = `/api/audit-logs/field/${entityType}/${entityId}/${fieldName}?limit=${limit}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const data = await response.json();
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return '(空)';
    }
    
    try {
      // Try to parse JSON if it's a string
      if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
        const parsed = JSON.parse(value);
        return JSON.stringify(parsed, null, 2);
      }
    } catch {
      // Not JSON, continue
    }
    
    return String(value);
  };

  const formatTimestamp = (timestamp: string): string => {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(timestamp));
  };

  const getActionLabel = (action: string): string => {
    switch (action) {
      case 'create':
        return '作成';
      case 'update':
        return '更新';
      case 'delete':
        return '削除';
      default:
        return action;
    }
  };

  const getActionColor = (action: string): string => {
    switch (action) {
      case 'create':
        return 'text-green-600 bg-green-50';
      case 'update':
        return 'text-blue-600 bg-blue-50';
      case 'delete':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">エラー: {error}</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-gray-600">変更履歴がありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">変更履歴</h3>
        <button
          onClick={fetchAuditLogs}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          更新
        </button>
      </div>

      <div className="space-y-3">
        {logs.map((log) => (
          <div
            key={log.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded ${getActionColor(
                    log.action
                  )}`}
                >
                  {getActionLabel(log.action)}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {log.field_name}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {formatTimestamp(log.timestamp)}
              </span>
            </div>

            <div className="text-sm text-gray-600 mb-2">
              <span className="font-medium">{log.user_email}</span> が変更
            </div>

            {log.action === 'update' && (
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="bg-red-50 border border-red-200 rounded p-2">
                  <div className="text-xs font-medium text-red-900 mb-1">
                    変更前
                  </div>
                  <div className="text-sm text-gray-900 whitespace-pre-wrap break-words">
                    {formatValue(log.old_value)}
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded p-2">
                  <div className="text-xs font-medium text-green-900 mb-1">
                    変更後
                  </div>
                  <div className="text-sm text-gray-900 whitespace-pre-wrap break-words">
                    {formatValue(log.new_value)}
                  </div>
                </div>
              </div>
            )}

            {log.action === 'create' && (
              <div className="bg-green-50 border border-green-200 rounded p-2 mt-3">
                <div className="text-xs font-medium text-green-900 mb-1">
                  初期値
                </div>
                <div className="text-sm text-gray-900 whitespace-pre-wrap break-words">
                  {formatValue(log.new_value)}
                </div>
              </div>
            )}

            {log.action === 'delete' && (
              <div className="bg-red-50 border border-red-200 rounded p-2 mt-3">
                <div className="text-xs font-medium text-red-900 mb-1">
                  削除された値
                </div>
                <div className="text-sm text-gray-900 whitespace-pre-wrap break-words">
                  {formatValue(log.old_value)}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
