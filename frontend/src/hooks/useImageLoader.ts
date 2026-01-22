import { useState, useEffect } from 'react';

interface UseImageLoaderOptions {
  src: string;
  fallbackSrc?: string;
  onError?: (error: Event) => void;
}

interface UseImageLoaderReturn {
  imageSrc: string;
  isLoading: boolean;
  hasError: boolean;
  retry: () => void;
}

/**
 * 画像読み込みを管理するカスタムフック
 * 
 * 機能:
 * - 画像読み込み状態の管理
 * - エラー時の自動リトライ（最大3回）
 * - フォールバック画像への自動切り替え
 * - エラーログの記録
 */
export const useImageLoader = ({
  src,
  fallbackSrc = '/placeholder-property.jpg',
  onError
}: UseImageLoaderOptions): UseImageLoaderReturn => {
  const [imageSrc, setImageSrc] = useState<string>(src);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);

  useEffect(() => {
    // srcが変更されたらリセット
    setImageSrc(src);
    setIsLoading(true);
    setHasError(false);
    setRetryCount(0);
  }, [src]);

  useEffect(() => {
    if (!imageSrc) {
      setIsLoading(false);
      setHasError(true);
      return;
    }

    // 画像を事前読み込み
    const img = new Image();
    
    img.onload = () => {
      setIsLoading(false);
      setHasError(false);
    };

    img.onerror = (error) => {
      console.error('[Image Error] Failed to load:', imageSrc, error);
      
      // エラーコールバックを実行
      if (onError) {
        onError(error as Event);
      }

      // リトライ回数が3回未満の場合はリトライ
      if (retryCount < 3) {
        console.log(`[Image Retry] Attempt ${retryCount + 1}/3 for:`, imageSrc);
        setRetryCount(prev => prev + 1);
        
        // 少し遅延してからリトライ（1秒、2秒、3秒と遅延を増やす）
        setTimeout(() => {
          setImageSrc(`${src}?retry=${retryCount + 1}&t=${Date.now()}`);
        }, 1000 * (retryCount + 1));
      } else {
        // リトライ上限に達したらフォールバック画像に切り替え
        console.log('[Image Fallback] Max retries reached, using fallback:', fallbackSrc);
        setImageSrc(fallbackSrc);
        setHasError(true);
        setIsLoading(false);
      }
    };

    img.src = imageSrc;

    return () => {
      // クリーンアップ
      img.onload = null;
      img.onerror = null;
    };
  }, [imageSrc, retryCount, src, fallbackSrc, onError]);

  const retry = () => {
    console.log('[Image Retry] Manual retry for:', src);
    setRetryCount(0);
    setImageSrc(`${src}?manual_retry=${Date.now()}`);
    setIsLoading(true);
    setHasError(false);
  };

  return {
    imageSrc,
    isLoading,
    hasError,
    retry
  };
};
