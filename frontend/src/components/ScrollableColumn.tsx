import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Box } from '@mui/material';

interface ScrollableColumnProps {
  children: React.ReactNode;
  height: number;
  onScroll?: (scrollTop: number) => void;
  ariaLabel: string;
  enablePerformanceOptimization?: boolean;
}

/**
 * スクロール可能な列コンポーネント
 * 
 * 震え防止のための最適化:
 * - 固定高さでレイアウトを安定化
 * - ハードウェアアクセラレーションで滑らかなスクロール
 * - overscroll-behaviorでバウンス防止
 * - スクロールイベントのthrottle処理
 */
const ScrollableColumn: React.FC<ScrollableColumnProps> = ({
  children,
  height,
  onScroll,
  ariaLabel,
  // enablePerformanceOptimization is reserved for future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  enablePerformanceOptimization: _enablePerformanceOptimization = true,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const throttleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTopRef = useRef<number>(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollEndTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Throttleされたスクロールハンドラー
   */
  const handleScrollThrottled = useCallback((scrollTop: number) => {
    if (!onScroll) return;

    // 既存のタイマーがある場合はスキップ
    if (throttleTimerRef.current) return;

    // スクロール位置が変わっていない場合はスキップ
    if (scrollTop === lastScrollTopRef.current) return;

    throttleTimerRef.current = setTimeout(() => {
      onScroll(scrollTop);
      lastScrollTopRef.current = scrollTop;
      throttleTimerRef.current = null;
    }, 32); // 30fps程度に抑えてパフォーマンス向上
  }, [onScroll]);

  /**
   * スクロール開始/終了の検知
   */
  const handleScrollState = useCallback(() => {
    if (!isScrolling) {
      setIsScrolling(true);
    }

    // スクロール終了タイマーをリセット
    if (scrollEndTimerRef.current) {
      clearTimeout(scrollEndTimerRef.current);
    }

    scrollEndTimerRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, [isScrolling]);

  /**
   * Passive event listenerを設定
   */
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const passiveScrollHandler = (e: Event) => {
      try {
        const target = e.target as HTMLElement;
        const scrollTop = target.scrollTop;
        handleScrollThrottled(scrollTop);
        handleScrollState();
      } catch (error) {
        // エラーを無視して継続
      }
    };

    element.addEventListener('scroll', passiveScrollHandler, { passive: true });

    return () => {
      element.removeEventListener('scroll', passiveScrollHandler);
      
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
      }
      if (scrollEndTimerRef.current) {
        clearTimeout(scrollEndTimerRef.current);
      }
    };
  }, [handleScrollThrottled, handleScrollState]);

  return (
    <Box
      ref={scrollRef}
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
      sx={{
        // 固定高さ - これが最も重要
        height: `${height}px`,
        minHeight: `${height}px`,
        maxHeight: `${height}px`,
        // スクロール設定
        overflowY: 'auto',
        overflowX: 'hidden',
        pr: 1,
        // 震え防止の核心: 独立したスタッキングコンテキスト
        position: 'relative',
        zIndex: 0,
        // ハードウェアアクセラレーション（GPUレイヤー化）
        transform: 'translate3d(0, 0, 0)',
        backfaceVisibility: 'hidden',
        // オーバースクロール防止
        overscrollBehavior: 'contain',
        // スクロールバーのスタイル
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: 'rgba(0,0,0,0.05)',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(0,0,0,0.2)',
          borderRadius: '4px',
          '&:hover': {
            backgroundColor: 'rgba(0,0,0,0.3)',
          },
        },
      }}
    >
      {/* 内部コンテナ - レイアウトを安定化 */}
      <Box
        sx={{
          // 内部コンテンツのレイアウト安定化
          position: 'relative',
          minHeight: '100%',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default ScrollableColumn;
