# Design Document

## Overview

買主詳細画面の右側列をスクロールすると画面が震える問題を解決するための設計です。この問題は、スクロール中の高さ再計算、レイアウトシフト、およびパフォーマンスの問題に起因しています。

本設計では、以下のアプローチで問題を解決します：
1. スクロール中の高さ再計算を防止
2. CSSベースのレイアウト安定化
3. スクロールイベントの最適化
4. エラーハンドリングの強化

## Architecture

### 現在の問題点

1. **高さ計算のタイミング問題**
   - `calculateContainerHeight()`がリサイズイベントで呼ばれる
   - スクロール中に意図せず高さが再計算される可能性
   - `window.innerHeight`がブラウザのUIによって変動する

2. **状態管理の複雑性**
   - `containerHeight`、`leftScrollPosition`、`rightScrollPosition`が独立して管理されている
   - スクロールハンドラーが状態更新をトリガーし、再レンダリングを引き起こす

3. **レイアウトの不安定性**
   - `ScrollableColumn`が動的な高さを受け取る
   - 高さの変更がレイアウトシフトを引き起こす

### 解決アプローチ

```
┌─────────────────────────────────────────────────────────┐
│                    BuyerDetailPage                       │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  useStableContainerHeight Hook                  │    │
│  │  - 初期高さ計算                                 │    │
│  │  - デバウンスされたリサイズハンドリング         │    │
│  │  - エラーハンドリング                           │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────────┐      ┌──────────────────┐        │
│  │  Left Column     │      │  Right Column    │        │
│  │                  │      │                  │        │
│  │ ScrollableColumn │      │ ScrollableColumn │        │
│  │ - 固定高さ       │      │ - 固定高さ       │        │
│  │ - CSS最適化      │      │ - CSS最適化      │        │
│  │ - Passive scroll │      │ - Passive scroll │        │
│  └──────────────────┘      └──────────────────┘        │
└─────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. useStableContainerHeight Hook

新しいカスタムフックを作成し、安定した高さ管理を実現します。

```typescript
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

function useStableContainerHeight(
  options?: UseStableContainerHeightOptions
): UseStableContainerHeightReturn
```

**責務:**
- 初期マウント時に高さを計算
- ウィンドウリサイズをデバウンス処理
- エラーハンドリングとフォールバック
- 開発モードでのデバッグログ

### 2. ScrollableColumn Component（改善版）

既存のコンポーネントを最適化します。

```typescript
interface ScrollableColumnProps {
  children: React.ReactNode;
  height: number;
  onScroll?: (scrollTop: number) => void;
  ariaLabel: string;
  enablePerformanceOptimization?: boolean;
}
```

**改善点:**
- CSS `contain` プロパティの追加
- `will-change` の適切な使用
- Passive event listenerの使用
- スクロールイベントのthrottle

### 3. viewportUtils（改善版）

既存のユーティリティ関数を強化します。

```typescript
// 改善された高さ計算
export const calculateContainerHeight = (
  options?: CalculateHeightOptions
): number

// デバウンス関数（throttleの代わり）
export const debounceResize = (
  callback: () => void,
  delay?: number
): (() => void) => void

// 高さ計算のバリデーション
export const validateHeight = (
  height: number,
  minHeight?: number,
  maxHeight?: number
): number
```

## Data Models

### ContainerHeightState

```typescript
interface ContainerHeightState {
  height: number;
  isStable: boolean;
  lastCalculated: number;
  calculationCount: number;
}
```

### ScrollState

```typescript
interface ScrollState {
  left: number;
  right: number;
  lastUpdated: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Height Stability During Scroll

*For any* scroll event on either column, the container height should remain constant and not trigger recalculation.

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Minimum Height Guarantee

*For any* viewport size, the calculated container height should be at least the minimum height value (400px).

**Validates: Requirements 2.4, 5.2**

### Property 3: Debounce Effectiveness

*For any* sequence of resize events within the debounce delay, only one height recalculation should occur.

**Validates: Requirements 2.2**

### Property 4: Scroll Position Preservation

*For any* height recalculation, the scroll positions of both columns should be preserved.

**Validates: Requirements 3.3**

### Property 5: Error Recovery

*For any* error during height calculation, the system should use a fallback height and continue normal operation.

**Validates: Requirements 5.1, 5.3, 5.5**

### Property 6: Performance Target

*For any* scroll operation, the frame rate should maintain at least 60fps (frame time ≤ 16.67ms).

**Validates: Requirements 4.1**

## Error Handling

### Height Calculation Errors

```typescript
try {
  const height = calculateContainerHeight(options);
  return validateHeight(height, minHeight, maxHeight);
} catch (error) {
  console.error('Height calculation failed:', error);
  logError(error, { context: 'height-calculation' });
  return FALLBACK_HEIGHT;
}
```

### Scroll Event Errors

```typescript
const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
  try {
    if (onScroll) {
      onScroll(e.currentTarget.scrollTop);
    }
  } catch (error) {
    console.error('Scroll handler error:', error);
    // Continue normal operation
  }
};
```

### Resize Handler Errors

```typescript
const handleResize = useCallback(() => {
  try {
    const newHeight = calculateContainerHeight(options);
    setContainerHeight(newHeight);
  } catch (error) {
    console.error('Resize handler error:', error);
    setError(error as Error);
    // Keep current height
  }
}, [options]);
```

## Testing Strategy

### Unit Tests

1. **useStableContainerHeight Hook**
   - 初期高さ計算のテスト
   - デバウンス動作のテスト
   - エラーハンドリングのテスト
   - フォールバック値のテスト

2. **viewportUtils**
   - `calculateContainerHeight`の境界値テスト
   - `debounceResize`のタイミングテスト
   - `validateHeight`の範囲チェックテスト

3. **ScrollableColumn**
   - スクロールイベントハンドリングのテスト
   - CSS最適化の適用テスト
   - Passive listenerの設定テスト

### Property-Based Tests

各correctness propertyに対して、property-based testを実装します。

**Property 1 Test:**
```typescript
// For any scroll event, height should remain constant
test('height stability during scroll', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 10000 }), // scroll position
      (scrollTop) => {
        const initialHeight = getContainerHeight();
        simulateScroll(scrollTop);
        const finalHeight = getContainerHeight();
        return initialHeight === finalHeight;
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 2 Test:**
```typescript
// For any viewport size, height >= minHeight
test('minimum height guarantee', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 300, max: 3000 }), // viewport height
      (viewportHeight) => {
        const height = calculateContainerHeight({ viewportHeight });
        return height >= MIN_HEIGHT;
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 3 Test:**
```typescript
// For any sequence of resize events within debounce delay, only one calculation
test('debounce effectiveness', () => {
  fc.assert(
    fc.property(
      fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 2, maxLength: 10 }), // delays
      (delays) => {
        let calculationCount = 0;
        const debouncedFn = debounceResize(() => calculationCount++, 200);
        
        delays.forEach((delay, index) => {
          setTimeout(debouncedFn, delay);
        });
        
        // Wait for debounce to complete
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(calculationCount === 1);
          }, 300);
        });
      }
    ),
    { numRuns: 50 }
  );
});
```

### Integration Tests

1. **スクロール安定性テスト**
   - 右側列をスクロールして高さが変わらないことを確認
   - 左側列をスクロールして高さが変わらないことを確認

2. **リサイズ動作テスト**
   - ウィンドウをリサイズして高さが適切に更新されることを確認
   - 連続リサイズでデバウンスが機能することを確認

3. **エラーリカバリーテスト**
   - 高さ計算エラー時にフォールバック値が使用されることを確認
   - エラー後も正常にスクロールできることを確認

### Performance Tests

1. **スクロールパフォーマンス**
   - Chrome DevToolsのPerformanceタブで60fps維持を確認
   - Lighthouseでスクロールパフォーマンススコアを測定

2. **メモリリーク**
   - 長時間のスクロール操作後のメモリ使用量を確認
   - イベントリスナーの適切なクリーンアップを確認

## Implementation Notes

### CSS Optimizations

```css
.scrollable-column {
  /* レイアウト計算の分離 */
  contain: layout style paint;
  
  /* スクロール最適化 */
  will-change: scroll-position;
  
  /* ハードウェアアクセラレーション */
  transform: translateZ(0);
  
  /* スムーズスクロール */
  scroll-behavior: smooth;
  
  /* オーバースクロール防止 */
  overscroll-behavior: contain;
}
```

### Passive Event Listeners

```typescript
useEffect(() => {
  const element = scrollRef.current;
  if (!element) return;

  const handleScroll = (e: Event) => {
    // スクロール処理
  };

  // Passive listenerを使用
  element.addEventListener('scroll', handleScroll, { passive: true });

  return () => {
    element.removeEventListener('scroll', handleScroll);
  };
}, []);
```

### Debounce vs Throttle

リサイズイベントには**debounce**を使用します（throttleではなく）：
- **Debounce**: 連続イベントの最後のみ実行（リサイズ完了時に1回だけ計算）
- **Throttle**: 一定間隔で実行（リサイズ中に複数回計算される可能性）

### Development Mode Debugging

```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('[Height Calculation]', {
    viewportHeight: window.innerHeight,
    calculatedHeight: height,
    timestamp: Date.now(),
  });
}
```

## Migration Strategy

1. **Phase 1: Hook作成**
   - `useStableContainerHeight`フックを作成
   - 既存の`calculateContainerHeight`を改善

2. **Phase 2: Component更新**
   - `ScrollableColumn`にCSS最適化を追加
   - Passive event listenerを実装

3. **Phase 3: Integration**
   - `BuyerDetailPage`で新しいフックを使用
   - 既存の高さ管理ロジックを置き換え

4. **Phase 4: Testing & Validation**
   - Property-based testsを実行
   - パフォーマンステストを実施
   - ユーザーテストで震え問題の解消を確認

