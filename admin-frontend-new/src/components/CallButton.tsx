/**
 * CallButton - 発信ボタンコンポーネント
 * 売主詳細ページで電話発信を開始するボタン
 */

import React, { useState } from 'react';
import { Phone, Loader2 } from 'lucide-react';
import { phoneApi } from '../services/phoneApi';
import type { Seller } from '../types';

interface CallButtonProps {
  seller: Seller;
  userId: string;
  onCallStarted?: (callLogId: string) => void;
  onError?: (error: Error) => void;
  className?: string;
  disabled?: boolean;
}

export const CallButton: React.FC<CallButtonProps> = ({
  seller,
  userId,
  onCallStarted,
  onError,
  className = '',
  disabled = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 電話番号のバリデーション
   */
  const validatePhoneNumber = (phoneNumber: string): boolean => {
    if (!phoneNumber || phoneNumber.trim() === '') {
      return false;
    }

    // 日本の電話番号形式をチェック（ハイフンあり/なし両対応）
    const phoneRegex = /^(\+81|0)\d{1,4}-?\d{1,4}-?\d{4}$/;
    return phoneRegex.test(phoneNumber.replace(/\s/g, ''));
  };

  /**
   * 発信処理
   */
  const handleCall = async () => {
    // バリデーション
    if (!seller.phoneNumber) {
      const errorMsg = '電話番号が登録されていません';
      setError(errorMsg);
      if (onError) {
        onError(new Error(errorMsg));
      }
      return;
    }

    if (!validatePhoneNumber(seller.phoneNumber)) {
      const errorMsg = '電話番号の形式が正しくありません';
      setError(errorMsg);
      if (onError) {
        onError(new Error(errorMsg));
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await phoneApi.startOutboundCall({
        sellerId: seller.id,
        phoneNumber: seller.phoneNumber,
        userId,
      });

      if (response.status === 'initiated') {
        // 成功時のコールバック
        if (onCallStarted) {
          onCallStarted(response.callLogId);
        }

        // 成功メッセージを一時表示
        setError(null);
        
        // 通話が開始されたことをユーザーに通知
        alert(`${seller.name}さんへの発信を開始しました`);
      } else {
        throw new Error(response.message || '発信に失敗しました');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '発信に失敗しました';
      setError(errorMsg);
      
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMsg));
      }

      // エラーメッセージを表示
      alert(`発信エラー: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = disabled || isLoading || !seller.phoneNumber;

  return (
    <div className="inline-block">
      <button
        onClick={handleCall}
        disabled={isDisabled}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-medium
          transition-all duration-200
          ${
            isDisabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 shadow-sm hover:shadow-md'
          }
          ${className}
        `}
        title={
          !seller.phoneNumber
            ? '電話番号が登録されていません'
            : isLoading
            ? '発信中...'
            : `${seller.name}さんに電話をかける`
        }
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>発信中...</span>
          </>
        ) : (
          <>
            <Phone className="w-5 h-5" />
            <span>電話をかける</span>
          </>
        )}
      </button>

      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {!seller.phoneNumber && !error && (
        <div className="mt-2 text-sm text-gray-500">
          電話番号が登録されていません
        </div>
      )}
    </div>
  );
};

export default CallButton;
