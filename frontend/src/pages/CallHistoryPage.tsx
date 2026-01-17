import React, { useState, useEffect } from 'react';
import { Phone, Search, Filter, Download, Clock, TrendingUp, TrendingDown, Minus, Tag, Volume2, Loader2, User as UserIcon } from 'lucide-react';
import { phoneApi } from '../services/phoneApi';
import { CallLogWithDetails, Sentiment } from '../types/phone';
import { AudioPlayer } from '../components/AudioPlayer';
import { useNavigate } from 'react-router-dom';

type SortField = 'started_at' | 'duration_seconds' | 'seller_name';
type SortOrder = 'asc' | 'desc';
type DirectionFilter = 'all' | 'inbound' | 'outbound';
type StatusFilter = 'all' | 'completed' | 'missed' | 'failed' | 'busy';

// CallLogCard component
const CallLogCard: React.FC<{ log: CallLogWithDetails }> = ({ log }) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [loadingRecording, setLoadingRecording] = useState(false);

  const loadRecordingUrl = async () => {
    if (recordingUrl || loadingRecording) return;

    setLoadingRecording(true);
    try {
      const response = await phoneApi.getRecording(log.id);
      setRecordingUrl(response.recordingUrl);
    } catch (err) {
      console.error('Failed to load recording URL:', err);
    } finally {
      setLoadingRecording(false);
    }
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '-';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getSentimentIcon = (sentiment: Sentiment | null) => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'negative':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'neutral':
        return <Minus className="w-4 h-4 text-gray-600" />;
      case 'mixed':
        return <Minus className="w-4 h-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getSentimentLabel = (sentiment: Sentiment | null): string => {
    const labels: Record<string, string> = {
      positive: 'ポジティブ',
      negative: 'ネガティブ',
      neutral: '中立',
      mixed: '混合',
    };
    return sentiment ? labels[sentiment] || '-' : '-';
  };

  const getSentimentColor = (sentiment: Sentiment | null): string => {
    const colors: Record<string, string> = {
      positive: 'bg-green-100 text-green-800',
      negative: 'bg-red-100 text-red-800',
      neutral: 'bg-gray-100 text-gray-800',
      mixed: 'bg-yellow-100 text-yellow-800',
    };
    return sentiment ? colors[sentiment] || 'bg-gray-100 text-gray-800' : 'bg-gray-100 text-gray-800';
  };

  const getDirectionLabel = (direction: string): string => {
    return direction === 'inbound' ? '着信' : '発信';
  };

  const getDirectionColor = (direction: string): string => {
    return direction === 'inbound' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      completed: '完了',
      missed: '不在着信',
      failed: '失敗',
      busy: '話中',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      completed: 'bg-green-100 text-green-800',
      missed: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      busy: 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      {/* Header */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`px-2 py-1 rounded text-xs font-medium ${getDirectionColor(log.direction)}`}>
                {getDirectionLabel(log.direction)}
              </span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(log.callStatus)}`}>
                {getStatusLabel(log.callStatus)}
              </span>
              {log.transcription?.sentiment && (
                <span
                  className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${getSentimentColor(log.transcription.sentiment)}`}
                >
                  {getSentimentIcon(log.transcription.sentiment)}
                  {getSentimentLabel(log.transcription.sentiment)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDateTime(log.startedAt)}
              </span>
              {log.durationSeconds && <span>通話時間: {formatDuration(log.durationSeconds)}</span>}
              {log.sellerName && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/sellers/${log.sellerId}`);
                  }}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                >
                  <UserIcon className="w-4 h-4" />
                  {log.sellerName}
                </button>
              )}
              {log.userName && <span>担当: {log.userName}</span>}
            </div>

            {/* Keywords */}
            {log.transcription?.detectedKeywords && log.transcription.detectedKeywords.length > 0 && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Tag className="w-4 h-4 text-gray-500" />
                {log.transcription.detectedKeywords.map((keyword: string, idx: number) => (
                  <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                    {keyword}
                  </span>
                ))}
              </div>
            )}
          </div>

          <button className="text-gray-400 hover:text-gray-600 ml-4">{expanded ? '▲' : '▼'}</button>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && log.transcription && (
        <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
          {/* Recording */}
          {log.hasRecording && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Volume2 className="w-4 h-4 text-gray-700" />
                <h4 className="font-medium text-sm text-gray-700">録音再生</h4>
              </div>
              {!recordingUrl && !loadingRecording && (
                <button
                  onClick={loadRecordingUrl}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                >
                  録音を読み込む
                </button>
              )}
              {loadingRecording && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  録音を読み込み中...
                </div>
              )}
              {recordingUrl && (
                <AudioPlayer
                  audioUrl={recordingUrl}
                  transcriptionSegments={log.transcription.transcriptionJson || []}
                  onError={(error) => console.error('Audio player error:', error)}
                />
              )}
            </div>
          )}

          {/* Transcription */}
          <div>
            <h4 className="font-medium text-sm text-gray-700 mb-2">文字起こし</h4>
            {log.transcription.transcriptionStatus === 'completed' ? (
              <div className="bg-white rounded p-3 text-sm text-gray-800 whitespace-pre-wrap">
                {log.transcription.transcriptionText || '文字起こしデータがありません'}
              </div>
            ) : log.transcription.transcriptionStatus === 'processing' ? (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                文字起こし処理中...
              </div>
            ) : log.transcription.transcriptionStatus === 'failed' ? (
              <div className="text-sm text-red-600">文字起こしに失敗しました</div>
            ) : (
              <div className="text-sm text-gray-600">文字起こし待機中...</div>
            )}
          </div>

          {/* Sentiment Scores */}
          {log.transcription.sentimentScores && (
            <div>
              <h5 className="font-medium text-xs text-gray-600 mb-2">感情分析スコア</h5>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span>ポジティブ:</span>
                  <span className="font-medium">
                    {(log.transcription.sentimentScores.positive * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>ネガティブ:</span>
                  <span className="font-medium">
                    {(log.transcription.sentimentScores.negative * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>中立:</span>
                  <span className="font-medium">
                    {(log.transcription.sentimentScores.neutral * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>混合:</span>
                  <span className="font-medium">
                    {(log.transcription.sentimentScores.mixed * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const CallHistoryPage: React.FC = () => {
  const [callLogs, setCallLogs] = useState<CallLogWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [userFilter, setUserFilter] = useState<string>('all');

  // Sorting
  const [sortField] = useState<SortField>('started_at');
  const [sortOrder] = useState<SortOrder>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // UI State
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadCallLogs();
  }, []);

  const loadCallLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await phoneApi.getCallLogs();
      setCallLogs(response.calls);
    } catch (err) {
      console.error('Failed to load call logs:', err);
      setError('通話履歴の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort call logs
  const filteredAndSortedLogs = React.useMemo(() => {
    let filtered = [...callLogs];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.sellerName?.toLowerCase().includes(query) ||
          log.sellerNumber?.toLowerCase().includes(query) ||
          log.phoneNumber.toLowerCase().includes(query) ||
          log.userName?.toLowerCase().includes(query)
      );
    }

    // Direction filter
    if (directionFilter !== 'all') {
      filtered = filtered.filter((log) => log.direction === directionFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((log) => log.callStatus === statusFilter);
    }

    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter((log) => new Date(log.startedAt) >= new Date(dateFrom));
    }
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((log) => new Date(log.startedAt) <= endDate);
    }

    // User filter
    if (userFilter !== 'all') {
      filtered = filtered.filter((log) => log.userId === userFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'started_at':
          aValue = new Date(a.startedAt).getTime();
          bValue = new Date(b.startedAt).getTime();
          break;
        case 'duration_seconds':
          aValue = a.durationSeconds || 0;
          bValue = b.durationSeconds || 0;
          break;
        case 'seller_name':
          aValue = a.sellerName || '';
          bValue = b.sellerName || '';
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [callLogs, searchQuery, directionFilter, statusFilter, dateFrom, dateTo, userFilter, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedLogs.length / itemsPerPage);
  const paginatedLogs = filteredAndSortedLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const resetFilters = () => {
    setSearchQuery('');
    setDirectionFilter('all');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setUserFilter('all');
    setCurrentPage(1);
  };

  const exportToCSV = () => {
    const headers = ['日時', '方向', '売主', '電話番号', '担当者', 'ステータス', '通話時間'];
    const rows = filteredAndSortedLogs.map((log) => [
      new Date(log.startedAt).toLocaleString('ja-JP'),
      log.direction === 'inbound' ? '着信' : '発信',
      log.sellerName || '-',
      log.phoneNumber,
      log.userName || '-',
      getStatusLabel(log.callStatus),
      log.durationSeconds ? `${Math.floor(log.durationSeconds / 60)}:${(log.durationSeconds % 60).toString().padStart(2, '0')}` : '-',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `call_history_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      completed: '完了',
      missed: '不在着信',
      failed: '失敗',
      busy: '話中',
    };
    return labels[status] || status;
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '-';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Get unique users for filter
  const uniqueUsers = React.useMemo(() => {
    const users = new Map<string, string>();
    callLogs.forEach((log) => {
      if (log.userId && log.userName) {
        users.set(log.userId, log.userName);
      }
    });
    return Array.from(users.entries());
  }, [callLogs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Phone className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">通話履歴</h1>
          </div>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            CSVエクスポート
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">総通話数</p>
                <p className="text-2xl font-bold text-gray-900">{filteredAndSortedLogs.length}</p>
              </div>
              <Phone className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">着信</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredAndSortedLogs.filter((log) => log.direction === 'inbound').length}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">発信</p>
                <p className="text-2xl font-bold text-purple-600">
                  {filteredAndSortedLogs.filter((log) => log.direction === 'outbound').length}
                </p>
              </div>
              <Phone className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">平均通話時間</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatDuration(
                    Math.floor(
                      filteredAndSortedLogs.reduce((sum, log) => sum + (log.durationSeconds || 0), 0) /
                        filteredAndSortedLogs.length
                    )
                  )}
                </p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="売主名、電話番号、担当者で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                showFilters ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-4 h-4" />
              フィルター
            </button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {/* Direction Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">方向</label>
                  <select
                    value={directionFilter}
                    onChange={(e) => setDirectionFilter(e.target.value as DirectionFilter)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">すべて</option>
                    <option value="inbound">着信</option>
                    <option value="outbound">発信</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">すべて</option>
                    <option value="completed">完了</option>
                    <option value="missed">不在着信</option>
                    <option value="failed">失敗</option>
                    <option value="busy">話中</option>
                  </select>
                </div>

                {/* User Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">担当者</label>
                  <select
                    value={userFilter}
                    onChange={(e) => setUserFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">すべて</option>
                    {uniqueUsers.map(([userId, userName]) => (
                      <option key={userId} value={userId}>
                        {userName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date From */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Date To */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">終了日</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Reset Filters */}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  フィルターをリセット
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Call Logs List */}
      {paginatedLogs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Phone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">通話履歴がありません</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paginatedLogs.map((log) => (
              <CallLogCard key={log.id} log={log} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">
                {filteredAndSortedLogs.length}件中 {(currentPage - 1) * itemsPerPage + 1}〜
                {Math.min(currentPage * itemsPerPage, filteredAndSortedLogs.length)}件を表示
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  前へ
                </button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 rounded-lg transition-colors ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  次へ
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
