import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import api from '../services/api';

interface ManualSyncButtonProps {
  onSyncComplete?: (result: SyncResult) => void;
  onSyncError?: (error: Error) => void;
}

interface SyncResult {
  success: boolean;
  recordsAdded: number;
  recordsUpdated: number;
  recordsDeleted: number;
  errors: Array<{ record: string; error: string }>;
}

/**
 * 手動更新ボタンコンポーネント
 * データベースの変更をスプレッドシートに反映
 */
export const ManualSyncButton: React.FC<ManualSyncButtonProps> = ({
  onSyncComplete,
  onSyncError,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleSync = async () => {
    setIsLoading(true);
    
    try {
      // データベース → スプレッドシートの同期を開始
      const startResponse = await api.post('/api/sync/manual/legacy', {
        mode: 'incremental' // 差分同期（変更されたデータのみ）
      });
      
      if (!startResponse.data.success) {
        throw new Error(startResponse.data.error || '同期の開始に失敗しました');
      }
      
      // 進行状況をポーリング
      let isComplete = false;
      let attempts = 0;
      const maxAttempts = 60; // 最大60秒（1秒ごとにチェック）
      
      while (!isComplete && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機
        
        const progressResponse = await api.get('/api/sync/manual/progress');
        const { isRunning, progress } = progressResponse.data.data;
        
        if (!isRunning) {
          isComplete = true;
          
          // 同期完了
          const result: SyncResult = {
            success: true,
            recordsAdded: 0,
            recordsUpdated: progress?.succeeded || 0,
            recordsDeleted: 0,
            errors: [],
          };
          
          setRetryCount(0);
          onSyncComplete?.(result);
        }
        
        attempts++;
      }
      
      if (!isComplete) {
        throw new Error('同期がタイムアウトしました。処理は継続されています。');
      }
    } catch (error: any) {
      console.error('Manual sync error:', error);
      
      // エラーが回復可能な場合、リトライを提案
      const isRecoverable = error.response?.data?.recoverable;
      const userMessage = error.response?.data?.error || error.message;
      
      // エラーオブジェクトにメタデータを追加
      const enhancedError = new Error(userMessage);
      (enhancedError as any).recoverable = isRecoverable;
      (enhancedError as any).retryCount = retryCount;
      
      onSyncError?.(enhancedError);
      
      // リトライカウントを増やす
      if (isRecoverable) {
        setRetryCount(prev => prev + 1);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleSync}
      disabled={isLoading}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg
        transition-colors duration-200
        ${isLoading 
          ? 'bg-gray-300 cursor-not-allowed' 
          : 'bg-blue-600 hover:bg-blue-700 text-white'
        }
      `}
      title="データベースの変更をスプレッドシートに反映"
    >
      <RefreshCw 
        className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} 
      />
      <span>{isLoading ? '更新中...' : '手動更新'}</span>
      {retryCount > 0 && !isLoading && (
        <span className="text-xs opacity-75">
          (リトライ: {retryCount})
        </span>
      )}
    </button>
  );
};
