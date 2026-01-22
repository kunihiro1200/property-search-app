import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { Phone, TrendingUp, Clock, Users, Download, Calendar, Loader2 } from 'lucide-react';
import { phoneApi } from '../services/phoneApi';
import type { GetCallStatisticsResponse } from '../types/phone';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

interface CallStatisticsProps {
  className?: string;
}

export const CallStatistics: React.FC<CallStatisticsProps> = ({ className = '' }) => {
  const [statistics, setStatistics] = useState<GetCallStatisticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date range state
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Default: last 30 days
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    loadStatistics();
  }, [startDate, endDate]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await phoneApi.getStatistics({
        startDate,
        endDate,
      });
      setStatistics(data);
    } catch (err) {
      console.error('Failed to load statistics:', err);
      setError('統計情報の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!statistics) return;

    const rows = [
      ['統計サマリー'],
      ['期間', `${startDate} 〜 ${endDate}`],
      ['総通話数', statistics.totalCalls.toString()],
      ['着信数', statistics.inboundCalls.toString()],
      ['発信数', statistics.outboundCalls.toString()],
      ['平均通話時間（秒）', statistics.averageDurationSeconds.toString()],
      ['総通話時間（秒）', statistics.totalDurationSeconds.toString()],
      [],
      ['ステータス別通話数'],
      ...Object.entries(statistics.callsByStatus).map(([status, count]) => [status, count.toString()]),
      [],
      ['担当者別統計'],
      ['担当者', '通話数', '平均通話時間（秒）', '総通話時間（秒）'],
      ...statistics.callsByUser.map((user) => [
        user.userName,
        user.callCount.toString(),
        user.averageDuration.toString(),
        user.totalDuration.toString(),
      ]),
    ];

    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `call_statistics_${startDate}_${endDate}.csv`;
    link.click();
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}時間${minutes}分`;
    }
    return `${minutes}分${secs}秒`;
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (!statistics) {
    return null;
  }

  // Chart data
  const statusChartData = {
    labels: Object.keys(statistics.callsByStatus).map((status) => {
      const labels: Record<string, string> = {
        completed: '完了',
        missed: '不在着信',
        failed: '失敗',
        busy: '話中',
        no_answer: '応答なし',
      };
      return labels[status] || status;
    }),
    datasets: [
      {
        label: '通話数',
        data: Object.values(statistics.callsByStatus),
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)', // green
          'rgba(245, 158, 11, 0.8)', // yellow
          'rgba(239, 68, 68, 0.8)', // red
          'rgba(249, 115, 22, 0.8)', // orange
          'rgba(156, 163, 175, 0.8)', // gray
        ],
      },
    ],
  };

  const userChartData = {
    labels: statistics.callsByUser.map((user) => user.userName),
    datasets: [
      {
        label: '通話数',
        data: statistics.callsByUser.map((user) => user.callCount),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
      },
    ],
  };

  const sentimentChartData = {
    labels: Object.keys(statistics.sentimentDistribution).map((sentiment) => {
      const labels: Record<string, string> = {
        positive: 'ポジティブ',
        neutral: '中立',
        negative: 'ネガティブ',
        mixed: '混合',
      };
      return labels[sentiment] || sentiment;
    }),
    datasets: [
      {
        data: Object.values(statistics.sentimentDistribution),
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)', // green
          'rgba(156, 163, 175, 0.8)', // gray
          'rgba(239, 68, 68, 0.8)', // red
          'rgba(245, 158, 11, 0.8)', // yellow
        ],
      },
    ],
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">通話統計</h2>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          CSVエクスポート
        </button>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-4">
          <Calendar className="w-5 h-5 text-gray-600" />
          <div className="flex items-center gap-4 flex-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">終了日</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">総通話数</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{statistics.totalCalls}</p>
            </div>
            <Phone className="w-12 h-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">着信 / 発信</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {statistics.inboundCalls} / {statistics.outboundCalls}
              </p>
            </div>
            <TrendingUp className="w-12 h-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">平均通話時間</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {formatDuration(statistics.averageDurationSeconds)}
              </p>
            </div>
            <Clock className="w-12 h-12 text-orange-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">総通話時間</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {formatDuration(statistics.totalDurationSeconds)}
              </p>
            </div>
            <Users className="w-12 h-12 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">ステータス別通話数</h3>
          <div className="h-64">
            <Bar
              data={statusChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Sentiment Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">感情分析分布</h3>
          <div className="h-64 flex items-center justify-center">
            <Pie
              data={sentimentChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* User Statistics */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">担当者別通話数</h3>
        <div className="h-64 mb-6">
          <Bar
            data={userChartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false,
                },
              },
            }}
          />
        </div>

        {/* User Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  担当者
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  通話数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  平均通話時間
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  総通話時間
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {statistics.callsByUser.map((user) => (
                <tr key={user.userId}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.userName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.callCount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDuration(user.averageDuration)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDuration(user.totalDuration)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Keywords */}
      {statistics.topKeywords && statistics.topKeywords.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">頻出キーワード</h3>
          <div className="flex flex-wrap gap-3">
            {statistics.topKeywords.map((keyword, index) => (
              <div
                key={index}
                className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg flex items-center gap-2"
              >
                <span className="font-medium">{keyword.keyword}</span>
                <span className="text-sm text-blue-600">({keyword.count})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CallStatistics;
