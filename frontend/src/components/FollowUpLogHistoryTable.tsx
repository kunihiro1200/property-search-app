import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import api from '../services/api';

interface FollowUpLogHistoryEntry {
  date: string;
  followUpLogId: string;
  sellerNumber: string;
  comment: string;
  assigneeFirstHalf: string;
  assigneeSecondHalf: string;
  assigneeAll: string;
  assigneeHalf: string;
  firstHalfCompleted: boolean;
  secondHalfCompleted: boolean;
  secondCallDueToNoAnswer: boolean;
}

interface FollowUpLogHistoryTableProps {
  sellerNumber: string;
}

export const FollowUpLogHistoryTable: React.FC<FollowUpLogHistoryTableProps> = ({ sellerNumber }) => {
  const [data, setData] = useState<FollowUpLogHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // データを取得する関数
  const fetchData = async (forceRefresh: boolean = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const url = `/api/sellers/${sellerNumber}/follow-up-logs/history${forceRefresh ? '?refresh=true' : ''}`;
      console.log('📡 Fetching follow-up log history:', url);
      
      const response = await api.get(url);
      console.log('✅ Response received:', response.data);

      if (response.data.success) {
        setData(response.data.data);
        if (response.data.lastUpdated) {
          setLastUpdated(new Date(response.data.lastUpdated));
        }
      } else {
        throw new Error(response.data.message || 'Failed to fetch follow-up log history');
      }
    } catch (err) {
      console.error('❌ Error fetching follow-up log history:', err);
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 初回マウント時にデータを取得
  useEffect(() => {
    fetchData();
  }, [sellerNumber]);

  // 自動同期: 5分ごとにキャッシュの鮮度をチェック
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastUpdated) {
        const now = new Date();
        const ageInMinutes = (now.getTime() - lastUpdated.getTime()) / (1000 * 60);
        if (ageInMinutes >= 5) {
          console.log('[FollowUpLogHistoryTable] Cache is stale, auto-refreshing');
          fetchData(true);
        }
      }
    }, 60000); // 1分ごとにチェック

    return () => clearInterval(interval);
  }, [lastUpdated]);

  // リフレッシュボタンのハンドラー
  const handleRefresh = () => {
    fetchData(true);
  };

  // 日付フォーマット
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return format(date, 'yyyy/MM/dd HH:mm', { locale: ja });
    } catch {
      return dateString;
    }
  };

  // ブール値インジケーター
  const BooleanIndicator: React.FC<{ value: boolean }> = ({ value }) => (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${value ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
      {value ? '✓' : '−'}
    </span>
  );

  if (loading && !refreshing) {
    return (
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">履歴データを読み込んでいます...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 border-t-2 border-gray-200 pt-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">追客ログ履歴（APPSHEET）</h3>
          <p className="text-sm text-gray-500 mt-1">
            過去のAPPSHEETで管理されていた追客活動記録です（参照のみ）
          </p>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-1">
              最終更新: {format(lastUpdated, 'yyyy/MM/dd HH:mm', { locale: ja })}
            </p>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
        >
          {refreshing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              更新中...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              更新
            </>
          )}
        </button>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">エラーが発生しました</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* データ表示 */}
      {data.length === 0 && !error ? (
        <div className="p-8 text-center bg-gray-50 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-2 text-sm text-gray-500">この売主の履歴データはありません</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日付</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">コメント</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">担当者（前半）</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">担当者（後半）</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">不在2回目</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((entry, index) => (
                <tr key={`${entry.followUpLogId}-${index}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(entry.date)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 max-w-md">
                    <div className="line-clamp-3">{entry.comment}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {entry.assigneeFirstHalf}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {entry.assigneeSecondHalf}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <BooleanIndicator value={entry.secondCallDueToNoAnswer} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
