/**
 * ビューポート高さからコンテナ高さを計算
 * @param headerHeight ヘッダーの高さ（デフォルト: 64px）
 * @param padding 上下のpadding（デフォルト: 48px）
 * @returns 計算されたコンテナ高さ
 */
export const calculateContainerHeight = (
  headerHeight: number = 64,
  padding: number = 48
): number => {
  try {
    const viewportHeight = window.innerHeight;
    const calculatedHeight = viewportHeight - headerHeight - padding;
    
    // 最小高さを確保（400px）
    return Math.max(calculatedHeight, 400);
  } catch (error) {
    console.warn('Failed to calculate container height:', error);
    // デフォルト値を返す
    return 600;
  }
};

/**
 * リサイズイベントをthrottleする
 * @param callback リサイズ時に実行する関数
 * @param delay throttleの遅延時間（ミリ秒）
 * @returns throttleされたイベントハンドラー
 */
export const throttleResize = (
  callback: () => void,
  delay: number = 200
): (() => void) => {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastRan: number = 0;

  return () => {
    const now = Date.now();

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (now - lastRan >= delay) {
      callback();
      lastRan = now;
    } else {
      timeoutId = setTimeout(() => {
        callback();
        lastRan = Date.now();
      }, delay - (now - lastRan));
    }
  };
};
