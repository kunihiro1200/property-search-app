/**
 * PhoneCallLogDisplay - AI電話統合の通話ログ表示コンポーネント
 * 文字起こし、感情分析、キーワード検出結果を表示
 */

import React, { useState, useEffect } from 'react';
import { Phone, Clock, TrendingUp, TrendingDown, Minus, Tag, Loader2, RefreshCw, Volume2 } from 'lucide-react';
import { phoneApi } from '../services/phoneApi';
import type { CallLogWithDetails, Sentiment } from '../types/phone';
import { AudioPlayer } from './AudioPlayer';

interface PhoneCallLogDisplayProps {
  sellerId: string;
  limit?: number;
  showTranscription?: boolean;
  className?: string;
}

export const PhoneCallLogDisplay: React.FC<PhoneCallLogDisplayProps> = ({
  sellerId,
  limit = 10,
  showTranscription = true,
  className = '',
}) => {
  const [callLogs, setCallLogs] = useState<CallLogWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [recordingUrls, setRecordingUrls] = useState<Record<string, string>>({});
  const [loadingRecordings, setLoadingRecordings] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadCallLogs();
  }, [sellerId, limit]);

  const loadCallLogs = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await phoneApi.getSellerCallLogs(sellerId, {
        page: 1,
        limit,
      });

      setCallLogs(response.calls);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '通話ログの取得に失敗しました';
      setError(errorMsg);
      console.error('Failed to load call logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecordingUrl = async (callId: string) => {
    if (recordingUrls[callId] || loadingRecordings[callId]) {
      return; // Already loaded or loading
    }

    setLoadingRecordings((prev) => ({ ...prev, [callId]: true }));

    try {
      const response = await phoneApi.getRecording(callId);
      setRecordingUrls((prev) => ({ ...prev, [callId]: response.recordingUrl }));
    } catch (err) {
      console.error('Failed to load recording URL:', err);
    } finally {
      setLoadingRecordings((prev) => ({ ...prev, [callId]: false }));
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
    switch (sentiment) {
      case 'positive':
        return 'ポジティブ';
      case 'negative':
        return 'ネガティブ';
      case 'neutral':
        return '中立';
      case 'mixed':
        return '混合';
      default:
        return '-';
    }
  };

  const getSentimentColor = (sentiment: Sentiment | null): string => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-100 text-green-800';
      case 'negative':
        return 'bg-red-100 text-red-800';
      case 'neutral':
        return 'bg-gray-100 text-gray-800';
      case 'mixed':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDirectionLabel = (direction: string): string => {
    return direction === 'inbound' ? '着信' : '発信';
  };

  const getDirectionColor = (direction: string): string => {
    return direction === 'inbound' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'completed':
        return '完了';
      case 'missed':
        return '不在';
      case 'failed':
        return '失敗';
      case 'busy':
        return '話中';
      case 'no_answer':
        return '応答なし';
      default:
        return status;
    }
  };

  const toggleExpand = (logId: string) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  if (isLoading) {
    return (
      <div className={`flex justify-center items-center py-8 ${className}`}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <p className="text-red-800">{error}</p>
          <button
            onClick={loadCallLogs}
            className="flex items-center gap-2 px-3 py-1 text-sm text-red-700 hover:text-red-900"
          >
            <RefreshCw className="w-4 h-4" />
            再試行
          </button>
        </div>
      </div>
    );
  }

  if (callLogs.length === 0) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-8 text-center ${className}`}>
        <Phone className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">通話履歴がありません</p>
        <p className="text-gray-500 text-sm mt-1">電話をかけると、ここに履歴が表示されます</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Phone className="w-5 h-5" />
          通話履歴
          <span className="text-sm font-normal text-gray-600">({callLogs.length}件)</span>
        </h3>
        <button
          onClick={loadCallLogs}
          className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          更新
        </button>
      </div>

      {callLogs.map((log) => (
        <div key={log.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          {/* ヘッダー */}
          <div
            className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleExpand(log.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getDirectionColor(log.direction)}`}>
                    {getDirectionLabel(log.direction)}
                  </span>
                  <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                    {getStatusLabel(log.callStatus)}
                  </span>
                  {log.transcription?.sentiment && (
                    <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${getSentimentColor(log.transcription.sentiment)}`}>
                      {getSentimentIcon(log.transcription.sentiment)}
                      {getSentimentLabel(log.transcription.sentiment)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDateTime(log.startedAt)}
                  </span>
                  {log.durationSeconds && (
                    <span>通話時間: {formatDuration(log.durationSeconds)}</span>
                  )}
                  {log.userName && <span>担当: {log.userName}</span>}
                </div>

                {/* キーワード */}
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

              <button className="text-gray-400 hover:text-gray-600 ml-4">
                {expandedLogId === log.id ? '▲' : '▼'}
              </button>
            </div>
          </div>

          {/* 展開コンテンツ */}
          {expandedLogId === log.id && showTranscription && log.transcription && (
            <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
              {/* 録音再生 */}
              {log.hasRecording && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Volume2 className="w-4 h-4 text-gray-700" />
                    <h4 className="font-medium text-sm text-gray-700">録音再生</h4>
                  </div>
                  {!recordingUrls[log.id] && !loadingRecordings[log.id] && (
                    <button
                      onClick={() => loadRecordingUrl(log.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                    >
                      録音を読み込む
                    </button>
                  )}
                  {loadingRecordings[log.id] && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      録音を読み込み中...
                    </div>
                  )}
                  {recordingUrls[log.id] && (
                    <AudioPlayer
                      audioUrl={recordingUrls[log.id]}
                      transcriptionSegments={log.transcription.transcriptionJson?.segments || []}
                      onError={(error) => console.error('Audio player error:', error)}
                    />
                  )}
                </div>
              )}

              {/* 文字起こし */}
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
                  <div className="text-sm text-red-600">
                    文字起こしに失敗しました
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">
                    文字起こし待機中...
                  </div>
                )}
              </div>

              {/* 感情スコア */}
              {log.transcription.sentimentScores && (
                <div>
                  <h5 className="font-medium text-xs text-gray-600 mb-2">感情分析スコア</h5>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span>ポジティブ:</span>
                      <span className="font-medium">{(log.transcription.sentimentScores.positive * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ネガティブ:</span>
                      <span className="font-medium">{(log.transcription.sentimentScores.negative * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>中立:</span>
                      <span className="font-medium">{(log.transcription.sentimentScores.neutral * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>混合:</span>
                      <span className="font-medium">{(log.transcription.sentimentScores.mixed * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default PhoneCallLogDisplay;
