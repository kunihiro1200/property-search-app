import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SpreadsheetSyncStatus } from '../components/SpreadsheetSyncStatus';
import { ManualSyncTrigger } from '../components/ManualSyncTrigger';

interface SyncLog {
  id: string;
  sync_type: string;
  seller_id?: string;
  status: string;
  error_message?: string;
  rows_affected: number;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
}

interface ErrorLog {
  id: string;
  error_type: string;
  error_message: string;
  seller_id?: string;
  operation?: string;
  retry_count: number;
  created_at: string;
}

interface Snapshot {
  id: string;
  created_at: string;
  seller_count: number;
  description?: string;
}

export const SpreadsheetSyncPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'status' | 'history' | 'errors' | 'snapshots'>('status');
  const [syncHistory, setSyncHistory] = useState<SyncLog[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSyncHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sync/history?limit=50');
      if (response.data.success) {
        setSyncHistory(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch sync history:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchErrorLogs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sync/errors?limit=50');
      if (response.data.success) {
        setErrorLogs(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch error logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSnapshots = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sync/snapshots');
      if (response.data.success) {
        setSnapshots(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch snapshots:', err);
    } finally {
      setLoading(false);
    }
  };

  const createSnapshot = async () => {
    const description = prompt('スナップショットの説明を入力してください（任意）:');
    try {
      const response = await api.post('/sync/snapshot', { description });
      if (response.data.success) {
        alert('スナップショットを作成しました');
        fetchSnapshots();
      }
    } catch (err: any) {
      alert(`スナップショットの作成に失敗しました: ${err.message}`);
    }
  };

  const rollback = async (snapshotId: string) => {
    if (!confirm('本当にこのスナップショットにロールバックしますか？現在のデータは失われます。')) {
      return;
    }

    try {
      const response = await api.post('/sync/rollback', { snapshotId });
      if (response.data.success) {
        alert(`ロールバックが完了しました。${response.data.data.restoredCount}件のレコードを復元しました。`);
      } else {
        alert(`ロールバックに失敗しました: ${response.data.error}`);
      }
    } catch (err: any) {
      alert(`ロールバックに失敗しました: ${err.message}`);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchSyncHistory();
    } else if (activeTab === 'errors') {
      fetchErrorLogs();
    } else if (activeTab === 'snapshots') {
      fetchSnapshots();
    }
  }, [activeTab]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">スプレッドシート同期管理</h1>

      {/* タブナビゲーション */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { key: 'status', label: 'ステータス' },
            { key: 'history', label: '同期履歴' },
            { key: 'errors', label: 'エラーログ' },
            { key: 'snapshots', label: 'スナップショット' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* タブコンテンツ */}
      {activeTab === 'status' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SpreadsheetSyncStatus />
          </div>
          <div>
            <ManualSyncTrigger />
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">同期履歴</h2>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-6 text-center">読み込み中...</div>
            ) : syncHistory.length === 0 ? (
              <div className="p-6 text-center text-gray-500">履歴がありません</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">タイプ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">処理件数</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">処理時間</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">開始時刻</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {syncHistory.map(log => (
                    <tr key={log.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{log.sync_type}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          log.status === 'success' ? 'bg-green-100 text-green-800' :
                          log.status === 'failure' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{log.rows_affected}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {new Date(log.started_at).toLocaleString('ja-JP')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'errors' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">エラーログ</h2>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-6 text-center">読み込み中...</div>
            ) : errorLogs.length === 0 ? (
              <div className="p-6 text-center text-gray-500">エラーログがありません</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">エラータイプ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">メッセージ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">リトライ回数</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">発生時刻</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {errorLogs.map(log => (
                    <tr key={log.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                          {log.error_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm max-w-md truncate">{log.error_message}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{log.operation || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{log.retry_count}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {new Date(log.created_at).toLocaleString('ja-JP')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'snapshots' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={createSnapshot}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              新しいスナップショットを作成
            </button>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">スナップショット一覧</h2>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-6 text-center">読み込み中...</div>
              ) : snapshots.length === 0 ? (
                <div className="p-6 text-center text-gray-500">スナップショットがありません</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">作成日時</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">レコード数</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">説明</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {snapshots.map(snapshot => (
                      <tr key={snapshot.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {new Date(snapshot.created_at).toLocaleString('ja-JP')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{snapshot.seller_count}</td>
                        <td className="px-6 py-4 text-sm">{snapshot.description || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => rollback(snapshot.id)}
                            className="text-blue-600 hover:text-blue-800 mr-4"
                          >
                            ロールバック
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
