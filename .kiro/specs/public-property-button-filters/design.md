# Design Document

## Overview

本設計は、物件公開サイトにボタン式の物件タイプフィルターと複数物件番号検索機能を追加します。既存の検索機能を拡張し、ユーザーが直感的に物件を絞り込めるようにします。

主な設計目標:
- 既存の検索UIとシームレスに統合
- レスポンシブデザインでモバイルとデスクトップの両方をサポート
- パフォーマンスを最適化し、高速な検索結果表示を実現
- アクセシビリティ標準に準拠

## Architecture

### Component Structure

```
PublicPropertiesPage
├── PropertyTypeFilterButtons (新規)
│   ├── FilterButton (戸建て)
│   ├── FilterButton (マンション)
│   ├── FilterButton (土地)
│   └── FilterButton (収益物件)
├── UnifiedSearchBar (拡張)
│   └── MultiplePropertyNumberParser (新規)
└── PublicPropertyCard (既存)
```

### Data Flow

1. **ユーザー操作** → FilterButton または SearchBar
2. **状態更新** → usePublicProperties hook
3. **API呼び出し** → GET /api/public-properties with query parameters
4. **結果表示** → PublicPropertyCard リスト

### State Management

フィルター状態とURL同期を使用:
- URL query parameters: `?types=detached,apartment&numbers=AA12345,AA12346`
- React state: `selectedTypes`, `searchQuery`
- URL変更時に自動的に状態を復元

## Components and Interfaces

### 1. PropertyTypeFilterButtons Component

**責務**: 物件タイプフィルターボタンのレンダリングと状態管理

```typescript
interface PropertyTypeFilterButtonsProps {
  selectedTypes: PropertyType[];
  onTypeToggle: (type: PropertyType) => void;
  disabled?: boolean;
}

type PropertyType = 'detached' | 'apartment' | 'land' | 'income';

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  detached: '戸建て',
  apartment: 'マンション',
  land: '土地',
  income: '収益物件'
};
```

**主要機能**:
- トグル可能なボタンUI
- 選択状態の視覚的フィードバック
- キーボードナビゲーション対応
- ARIA属性による支援技術サポート

### 2. MultiplePropertyNumberParser Service

**責務**: 複数物件番号の解析とバリデーション

```typescript
interface ParsedPropertyNumbers {
  valid: string[];
  invalid: string[];
}

class MultiplePropertyNumberParser {
  parse(input: string): ParsedPropertyNumbers;
  private normalizePropertyNumber(number: string): string | null;
  private validatePropertyNumber(number: string): boolean;
}
```

**解析ロジック**:
- 区切り文字: スペース、カンマ、改行
- 正規化: 大文字変換、プレフィックス補完
- バリデーション: AA + 5桁数字のパターンマッチ

### 3. usePublicProperties Hook (拡張)

**既存フックの拡張**: フィルター機能を追加

```typescript
interface UsePublicPropertiesOptions {
  selectedTypes?: PropertyType[];
  propertyNumbers?: string[];
  // 既存のオプション...
}

interface UsePublicPropertiesReturn {
  properties: PublicProperty[];
  loading: boolean;
  error: Error | null;
  // フィルター関連
  selectedTypes: PropertyType[];
  toggleType: (type: PropertyType) => void;
  setPropertyNumbers: (numbers: string[]) => void;
  // 既存の返り値...
}
```

### 4. API Endpoint (拡張)

**既存エンドポイントの拡張**: GET `/api/public-properties`

**新規クエリパラメータ**:
- `types`: カンマ区切りの物件タイプ (例: `detached,apartment`)
- `numbers`: カンマ区切りの物件番号 (例: `AA12345,AA12346`)

**フィルタリングロジック**:
```typescript
// Pseudo-code
WHERE (
  (types.length === 0 OR property_type IN types)
  AND
  (numbers.length === 0 OR property_number IN numbers)
)
```

## Data Models

### PropertyType Enum

```typescript
enum PropertyType {
  DETACHED = 'detached',    // 戸建て
  APARTMENT = 'apartment',  // マンション
  LAND = 'land',           // 土地
  INCOME = 'income'        // 収益物件
}
```

### FilterState Interface

```typescript
interface FilterState {
  selectedTypes: PropertyType[];
  propertyNumbers: string[];
  timestamp: number; // キャッシュ管理用
}
```

### URL Parameter Schema

```
?types=detached,apartment&numbers=AA12345,AA12346
```

- `types`: オプショナル、カンマ区切り
- `numbers`: オプショナル、カンマ区切り
- 両方が空の場合: 全物件を表示

## Correctness Properties

### Correctness Propertiesとは

Correctness Properties(正確性プロパティ)は、システムが常に満たすべき不変条件です。これらは要件の受入基準から導出され、実装が正しいことを検証するための基準となります。各プロパティは普遍量化(For all/For any)を使用して表現され、どの要件を検証するかを明示します。

### Core Filtering Properties

**Property 1: ボタン表示の完全性**
- **定義**: For all ページロード時、System は正確に4つの物件タイプボタン(戸建て、マンション、土地、収益物件)を表示する
- **Validates: Requirements 1.1**
- **検証方法**: ボタン要素数とラベルテキストの確認

**Property 2: 選択状態の一貫性**
- **定義**: For all ボタンクリック操作、ボタンの視覚的状態は内部の選択状態と一致する
- **Validates: Requirements 1.2, 1.3**
- **検証方法**: クリック前後の状態とDOM属性の比較

**Property 3: フィルタリングの正確性**
- **定義**: For all 選択されたタイプの集合 T、表示される物件の集合 P において、P の各要素の property_type は T に含まれる
- **Validates: Requirements 1.4, 1.5**
- **検証方法**: 表示物件のタイプが選択タイプに含まれることの確認

**Property 4: 検索解析の正確性**
- **定義**: For all 入力文字列 S、MultiplePropertyNumberParser.parse(S) の結果において、valid配列の各要素は正規化された有効な物件番号である
- **Validates: Requirements 2.2, 2.4, 2.5**
- **検証方法**: 解析結果の各要素がAA+5桁数字パターンに一致することの確認

**Property 5: 統合フィルターの正確性**
- **定義**: For all 選択タイプ集合 T と物件番号集合 N、表示される物件 P において、P の各要素は (property_type ∈ T OR T = ∅) AND (property_number ∈ N OR N = ∅) を満たす
- **Validates: Requirements 3.1**
- **検証方法**: 両条件の論理積が正しく適用されることの確認

### State Management Properties

**Property 6: URL同期の一貫性**
- **定義**: For all フィルター状態変更、URLクエリパラメータは変更後の状態を正確に反映する
- **Validates: Requirements 3.4, 3.5**
- **検証方法**: 状態変更後のURL解析結果と内部状態の比較

**Property 7: 状態復元の正確性**
- **定義**: For all URLパラメータ U、ページロード時に復元される状態 S は U から導出される状態と等しい
- **Validates: Requirements 3.5**
- **検証方法**: URL → 状態 → URL の往復変換の一貫性確認

**Property 8: 状態独立性**
- **定義**: For all 検索クエリのクリア操作、タイプフィルター選択状態は変更されない。For all タイプフィルターのクリア操作、検索クエリは変更されない
- **Validates: Requirements 3.2, 3.3**
- **検証方法**: 各操作前後の他方の状態の不変性確認

### Performance Properties

**Property 9: 応答時間の保証**
- **定義**: For all フィルター変更操作、結果表示までの時間は500ミリ秒以下である
- **Validates: Requirements 5.1**
- **検証方法**: 操作開始から結果表示までの時間測定

**Property 10: 解析速度の保証**
- **定義**: For all 入力文字列 S (|S| ≤ 1000文字)、MultiplePropertyNumberParser.parse(S) の実行時間は100ミリ秒以下である
- **Validates: Requirements 5.2**
- **検証方法**: 解析処理の実行時間測定

**Property 11: デバウンスの有効性**
- **定義**: For all 連続入力シーケンス (間隔 < デバウンス時間)、API呼び出しは最後の入力後に1回のみ実行される
- **Validates: Requirements 5.3**
- **検証方法**: 連続入力時のAPI呼び出し回数のカウント

### Accessibility Properties

**Property 12: キーボード操作の完全性**
- **定義**: For all フィルター機能、TabキーとEnterキーのみを使用して全操作が実行可能である
- **Validates: Requirements 6.1**
- **検証方法**: マウスを使用せずに全機能を操作できることの確認

**Property 13: ARIA属性の完全性**
- **定義**: For all インタラクティブ要素 E、E は適切なARIAロールとラベルを持つ
- **Validates: Requirements 6.2**
- **検証方法**: 全インタラクティブ要素のARIA属性の存在確認

**Property 14: フォーカス管理の正確性**
- **定義**: For all Tab操作、フォーカス移動順序は視覚的な要素配置順序と一致する
- **Validates: Requirements 6.5**
- **検証方法**: Tab順序と視覚的順序の比較

### Responsive Design Properties

**Property 15: レイアウト適応の正確性**
- **定義**: For all 画面幅 W、W < 768px の場合はモバイルレイアウト、W ≥ 768px の場合はデスクトップレイアウトが適用される
- **Validates: Requirements 4.1, 4.2, 4.3**
- **検証方法**: 各画面サイズでのレイアウトの視覚的確認

**Property 16: タッチターゲットサイズの保証**
- **定義**: For all ボタン要素 B、B の幅と高さは両方とも44ピクセル以上である
- **Validates: Requirements 4.4**
- **検証方法**: 全ボタンの計算されたサイズの測定

## Error Handling

### Input Validation Errors

**エラー: 無効な物件番号フォーマット**
- **発生条件**: ユーザーが無効なフォーマットの物件番号を入力
- **処理**: 無効な番号を無視し、有効な番号のみで検索を実行
- **ユーザーフィードバック**: なし(サイレントに処理)
- **ログ**: デバッグレベルで無効な入力を記録

**エラー: 空の検索結果**
- **発生条件**: フィルター条件に一致する物件が存在しない
- **処理**: 空の結果リストを表示
- **ユーザーフィードバック**: "条件に一致する物件が見つかりませんでした" メッセージを表示
- **ログ**: 情報レベルで検索条件を記録

### API Errors

**エラー: ネットワークエラー**
- **発生条件**: APIリクエストがネットワークエラーで失敗
- **処理**: 前回の検索結果を維持、エラーメッセージを表示
- **ユーザーフィードバック**: "ネットワークエラーが発生しました。もう一度お試しください。" トースト通知
- **リトライ**: 自動リトライなし(ユーザーが手動で再試行)
- **ログ**: エラーレベルでネットワークエラーを記録

**エラー: APIタイムアウト**
- **発生条件**: APIリクエストが30秒以内に応答しない
- **処理**: リクエストをキャンセル、エラーメッセージを表示
- **ユーザーフィードバック**: "リクエストがタイムアウトしました。もう一度お試しください。" トースト通知
- **リトライ**: 自動リトライなし
- **ログ**: 警告レベルでタイムアウトを記録

**エラー: サーバーエラー (5xx)**
- **発生条件**: APIが500番台のステータスコードを返す
- **処理**: 前回の結果を維持、エラーメッセージを表示
- **ユーザーフィードバック**: "サーバーエラーが発生しました。しばらくしてからお試しください。" トースト通知
- **リトライ**: 自動リトライなし
- **ログ**: エラーレベルでサーバーエラーとレスポンスを記録

### State Management Errors

**エラー: 無効なURLパラメータ**
- **発生条件**: URLに無効なクエリパラメータが含まれる
- **処理**: 無効なパラメータを無視し、有効なパラメータのみで状態を復元
- **ユーザーフィードバック**: なし(サイレントに処理)
- **ログ**: デバッグレベルで無効なパラメータを記録

**エラー: 状態復元の失敗**
- **発生条件**: URLパラメータからの状態復元が失敗
- **処理**: デフォルト状態(全物件表示)にフォールバック
- **ユーザーフィードバック**: なし
- **ログ**: 警告レベルで復元失敗を記録

### Browser Compatibility Errors

**エラー: URLSearchParams未サポート**
- **発生条件**: 古いブラウザでURLSearchParamsが利用不可
- **処理**: ポリフィルを使用、または基本的な文字列解析にフォールバック
- **ユーザーフィードバック**: なし
- **ログ**: 情報レベルでフォールバック使用を記録

## Testing Strategy

### Unit Tests

**テスト対象**: MultiplePropertyNumberParser

1. **正常系テスト**
   - 単一物件番号の解析
   - 複数物件番号の解析(スペース区切り)
   - 複数物件番号の解析(カンマ区切り)
   - 複数物件番号の解析(改行区切り)
   - 混合区切り文字の解析
   - 大文字小文字の正規化
   - プレフィックスなし番号の補完

2. **異常系テスト**
   - 空文字列の処理
   - 無効なフォーマットの処理
   - 有効・無効混在の処理
   - 特殊文字を含む入力の処理

**テスト対象**: PropertyTypeFilterButtons

1. **レンダリングテスト**
   - 4つのボタンが正しく表示される
   - 各ボタンに正しいラベルが表示される
   - 選択状態が視覚的に反映される

2. **インタラクションテスト**
   - ボタンクリックで選択状態がトグルされる
   - 複数ボタンの同時選択が可能
   - onTypeToggleコールバックが正しく呼ばれる

3. **アクセシビリティテスト**
   - ARIA属性が正しく設定される
   - キーボードナビゲーションが機能する
   - フォーカスインジケーターが表示される

**テスト対象**: usePublicProperties Hook

1. **状態管理テスト**
   - 初期状態が正しく設定される
   - toggleTypeで状態が更新される
   - setPropertyNumbersで状態が更新される
   - URL同期が正しく機能する

2. **API統合テスト**
   - フィルター変更時にAPIが呼ばれる
   - デバウンスが正しく機能する
   - エラー時に前回結果が維持される

### Property-Based Tests

**最小イテレーション数**: 各プロパティテストは最低100回実行

**Property Test 1: フィルタリングの正確性**
```typescript
// For all 選択タイプ集合、表示物件は選択タイプに含まれる
fc.assert(
  fc.property(
    fc.array(fc.constantFrom('detached', 'apartment', 'land', 'income')),
    async (selectedTypes) => {
      const result = await filterProperties(selectedTypes);
      return result.every(p => 
        selectedTypes.length === 0 || selectedTypes.includes(p.property_type)
      );
    }
  ),
  { numRuns: 100 }
);
```

**Property Test 2: 検索解析の正確性**
```typescript
// For all 入力文字列、解析結果の有効な番号は正規化されたフォーマット
fc.assert(
  fc.property(
    fc.array(fc.string()),
    (inputs) => {
      const parser = new MultiplePropertyNumberParser();
      const result = parser.parse(inputs.join(' '));
      return result.valid.every(num => /^AA\d{5}$/.test(num));
    }
  ),
  { numRuns: 100 }
);
```

**Property Test 3: URL同期の一貫性**
```typescript
// For all フィルター状態、URL → 状態 → URL の往復変換が一貫
fc.assert(
  fc.property(
    fc.record({
      types: fc.array(fc.constantFrom('detached', 'apartment', 'land', 'income')),
      numbers: fc.array(fc.string().filter(s => /^AA\d{5}$/.test(s)))
    }),
    (state) => {
      const url = stateToUrl(state);
      const restored = urlToState(url);
      return deepEqual(state, restored);
    }
  ),
  { numRuns: 100 }
);
```

**Property Test 4: 状態独立性**
```typescript
// For all 初期状態、検索クリアはタイプ選択に影響しない
fc.assert(
  fc.property(
    fc.record({
      types: fc.array(fc.constantFrom('detached', 'apartment', 'land', 'income')),
      query: fc.string()
    }),
    (initialState) => {
      const afterClear = clearSearchQuery(initialState);
      return deepEqual(initialState.types, afterClear.types);
    }
  ),
  { numRuns: 100 }
);
```

**Property Test 5: 統合フィルターの正確性**
```typescript
// For all タイプと番号の組み合わせ、AND論理が正しく適用される
fc.assert(
  fc.property(
    fc.record({
      types: fc.array(fc.constantFrom('detached', 'apartment', 'land', 'income')),
      numbers: fc.array(fc.string().filter(s => /^AA\d{5}$/.test(s)))
    }),
    async (filters) => {
      const result = await filterProperties(filters.types, filters.numbers);
      return result.every(p => 
        (filters.types.length === 0 || filters.types.includes(p.property_type)) &&
        (filters.numbers.length === 0 || filters.numbers.includes(p.property_number))
      );
    }
  ),
  { numRuns: 100 }
);
```

### Integration Tests

**テストシナリオ 1: 基本的なフィルタリングフロー**
1. ページをロード
2. "戸建て"ボタンをクリック
3. 戸建て物件のみが表示されることを確認
4. "マンション"ボタンを追加クリック
5. 戸建てとマンション物件が表示されることを確認

**テストシナリオ 2: 複数物件番号検索**
1. ページをロード
2. 検索フィールドに "AA12345 AA12346" を入力
3. 2つの物件が表示されることを確認
4. 各物件の番号が入力と一致することを確認

**テストシナリオ 3: フィルターと検索の統合**
1. ページをロード
2. "戸建て"ボタンをクリック
3. 検索フィールドに物件番号を入力
4. 戸建てかつ指定番号の物件のみが表示されることを確認

**テストシナリオ 4: 状態の永続化**
1. フィルターと検索を設定
2. 物件詳細ページに遷移
3. ブラウザバックで戻る
4. フィルターと検索状態が維持されていることを確認

**テストシナリオ 5: エラーハンドリング**
1. ネットワークをオフラインに設定
2. フィルターを変更
3. エラーメッセージが表示されることを確認
4. 前回の結果が維持されていることを確認

### Performance Tests

**テスト 1: フィルター応答時間**
- フィルター変更から結果表示までの時間を測定
- 目標: 500ms以下
- 測定回数: 10回の平均

**テスト 2: 解析速度**
- 100個の物件番号を含む文字列の解析時間を測定
- 目標: 100ms以下
- 測定回数: 10回の平均

**テスト 3: デバウンス効果**
- 1秒間に10回の連続入力を実行
- API呼び出し回数をカウント
- 目標: 1回のみ

### Accessibility Tests

**テスト 1: キーボードナビゲーション**
- Tabキーで全ボタンにフォーカス可能
- Enterキーで選択状態をトグル可能
- フォーカス順序が論理的

**テスト 2: スクリーンリーダー対応**
- ARIA属性が正しく設定されている
- 状態変更がaria-liveで通知される
- ボタンのロールとラベルが適切

**テスト 3: 色覚異常対応**
- 選択状態が色だけでなく形状やテキストでも識別可能
- コントラスト比がWCAG AA基準を満たす

### Responsive Design Tests

**テスト 1: モバイルレイアウト**
- 画面幅320px-767pxでモバイルレイアウトが適用される
- ボタンが縦並びまたは折り返しで表示される
- タッチターゲットサイズが44x44px以上

**テスト 2: デスクトップレイアウト**
- 画面幅768px以上でデスクトップレイアウトが適用される
- ボタンが横並びで表示される
- 適切な余白とサイズが確保される

**テスト 3: タブレットレイアウト**
- 画面幅768px-1024pxで適切なレイアウトが適用される
- タッチとマウス両方の操作に対応

