import { useState, useEffect, useCallback, useRef } from 'react';
import { calculateContainerHeight } from '../utils/viewportUtils';

interface UseStableContainerHeightOptions {
  headerHeight?: number;
  padding?: number;
  minHeight?: number;
  debounceDelay?: number;
}

interface UseStableContainerHeightReturn {
  containerHeight: number;
  isCalculating: boolean;
  error: Error | null;
}

/**
 * 安定したコンテナ高さを管理するカスタムフック
 * 
 * 初期マウント時に高さを計算し、ウィンドウリサイズ時のみ再計算します。
 * スクロール中は一切高さを変更しません。
 * 
 * @param options - 高さ計算のオプション
 * @returns containerHeight, isCalculating, error
 */
export function useStableContainerHeight(
  options: UseStableContainerHeightOptions = {}
): UseStableContainerHeightReturn {
  const {
    headerHeight = 64,
    padding = 48,
    minHeight = 400,
    debounceDelay = 300,
  } = options;

  // 初期高さを計算（一度だけ）
  const [containerHeight, setContainerHeight] = useState<number>(() => {
    try {
      const height = calculateContainerHeight(headerHeight, padding);
      return Math.max(height, minHeight);
    } catch {
      return minHeight;
    }
  });

  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // デバウンスタイマーの参照
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // 初期化済みフラグ
  const isInitializedRef = useRef(false);

  /**
   * 高さを再計算する関数（リサイズ時のみ呼ばれる）
   */
  const recalculateHeight = useCallback(() => {
    try {
      setIsCalculating(true);
      setError(null);

      const newHeight = calculateContainerHeight(headerHeight, padding);
      const validatedHeight = Math.max(newHeight, minHeight);

      setContainerHeight(validatedHeight);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      setContainerHeight(minHeight);
    } finally {
      setIsCalculating(false);
    }
  }, [headerHeight, padding, minHeight]);

  /**
   * デバウンスされたリサイズハンドラー
   */
  const handleResize = useCallback(() => {
    // 初期化前は無視
    if (!isInitializedRef.current) return;

    // 既存のタイマーをクリア
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 新しいタイマーを設定（リサイズ完了後に再計算）
    debounceTimerRef.current = setTimeout(() => {
      recalculateHeight();
    }, debounceDelay);
  }, [recalculateHeight, debounceDelay]);

  // 初期化とリサイズイベントのリスナーを設定
  useEffect(() => {
    // 初期化完了をマーク
    isInitializedRef.current = true;

    // リサイズイベントのみ監視（スクロールは監視しない）
    window.addEventListener('resize', handleResize);

    // クリーンアップ
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [handleResize]);

  return {
    containerHeight,
    isCalculating,
    error,
  };
}
