import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info';

export interface SyncNotificationData {
  recordsAdded: number;
  recordsUpdated: number;
  recordsDeleted: number;
  hasChanges: boolean;
}

interface SyncNotificationProps {
  type?: NotificationType;
  message?: string;
  details?: string;
  data?: SyncNotificationData | null;
  position?: 'top' | 'bottom';
  autoHideDuration?: number;
  onClose?: () => void;
}

/**
 * データ更新通知コンポーネント
 * 自動更新時のデータ変更通知を表示
 */
export const SyncNotification: React.FC<SyncNotificationProps> = ({
  type = 'success',
  message,
  details,
  data,
  position = 'top',
  autoHideDuration = 5000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // dataまたはmessageがある場合のみ表示
    if (data || message) {
      setIsVisible(true);
    }
  }, [data, message]);

  useEffect(() => {
    if (isVisible && autoHideDuration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, autoHideDuration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, autoHideDuration, onClose]);

  if (!isVisible || (!data && !message)) {
    return null;
  }

  // dataがある場合は自動的にメッセージを生成
  const displayMessage = message || (data ? generateSyncMessage(data) : '');
  const displayType = type || (data?.hasChanges ? 'success' : 'info');

  const getIcon = () => {
    switch (displayType) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'info':
        return <AlertCircle className="w-5 h-5 text-blue-600" />;
    }
  };

  const getBackgroundColor = () => {
    switch (displayType) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
    }
  };

  const positionClass = position === 'top' ? 'top-4' : 'bottom-4';

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  return (
    <div
      className={`
        fixed ${positionClass} right-4 z-50
        max-w-md p-4 rounded-lg border shadow-lg
        ${getBackgroundColor()}
        animate-slide-in-right
      `}
    >
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1">
          <p className="font-medium text-gray-900">{displayMessage}</p>
          {details && (
            <p className="mt-1 text-sm text-gray-600">{details}</p>
          )}
        </div>
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="閉じる"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// ヘルパー関数: 同期結果からメッセージを生成
function generateSyncMessage(data: SyncNotificationData): string {
  if (!data.hasChanges) {
    return 'データは最新です';
  }

  const parts: string[] = [];
  if (data.recordsAdded > 0) {
    parts.push(`${data.recordsAdded}件追加`);
  }
  if (data.recordsUpdated > 0) {
    parts.push(`${data.recordsUpdated}件更新`);
  }
  if (data.recordsDeleted > 0) {
    parts.push(`${data.recordsDeleted}件削除`);
  }

  return `データが更新されました（${parts.join('、')}）`;
}
