# EE2ボタン色修正 バグフィックスデザイン

## Overview

地図表示（`PropertyMapView`）のInfoWindow内「詳細を見る」ボタン（EE2ボタン）の色が、
物件の `atbb_status` に関わらず固定色（`#FFC107` 黄色）で表示されているバグを修正する。

修正方針は、既存の `mapAtbbStatusToDisplayStatus` ユーティリティと `BADGE_CONFIGS` 定数を
活用し、マーカー色と同じロジックでボタン色を動的に決定することで、最小限の変更で対応する。

影響ファイル: `frontend/src/components/PropertyMapView.tsx`（1箇所のみ）

---

## Glossary

- **Bug_Condition (C)**: バグが発生する条件 — InfoWindowの「詳細を見る」ボタンが `atbb_status` に関わらず固定色で表示される状態
- **Property (P)**: 期待される正しい動作 — `atbb_status` の値に応じてボタン色が動的に変わること
- **Preservation**: 修正によって変更してはならない既存の動作（マーカー色、ナビゲーション動作、バッジ表示など）
- **EE2ボタン**: InfoWindow内の「詳細を見る」ボタン（物件詳細ページへ遷移するボタン）
- **atbb_status**: ATBBシステムから取得する物件の公開ステータス文字列
- **mapAtbbStatusToDisplayStatus**: `atbb_status` を `StatusType`（`sold` / `private` / `pre_publish` / `other`）に変換するユーティリティ関数（`frontend/src/utils/atbbStatusDisplayMapper.ts`）
- **BADGE_CONFIGS**: `StatusType` ごとの色設定を保持する定数オブジェクト（`PropertyMapView.tsx` 内で定義）
- **StatusType**: `'pre_publish' | 'private' | 'sold' | 'other'` の4種類

---

## Bug Details

### Bug Condition

InfoWindowの「詳細を見る」ボタンの `backgroundColor` が `atbb_status` の値に関わらず
固定値（`#FFC107`）でハードコードされており、ステータスに応じた色変更が行われていない。

**Formal Specification:**
```
FUNCTION isBugCondition(property)
  INPUT: property of type PropertyWithCoordinates
  OUTPUT: boolean

  buttonColor := getButtonColor(property.atbb_status)
  expectedColor := getExpectedButtonColor(property.atbb_status)

  RETURN buttonColor !== expectedColor
END FUNCTION

FUNCTION getExpectedButtonColor(atbbStatus)
  statusType := mapAtbbStatusToDisplayStatus(atbbStatus).statusType

  IF statusType === 'sold'        THEN RETURN '#9e9e9e'   // グレー（成約済み）
  IF statusType === 'private'     THEN RETURN '#f44336'   // 赤（非公開・配信メールのみ）
  IF statusType === 'pre_publish' THEN RETURN '#ff9800'   // オレンジ（公開前）
  ELSE                                 RETURN '#2196F3'   // 青（販売中・その他）
END FUNCTION
```

### Examples

| atbb_status の値 | 現在のボタン色 | 期待されるボタン色 | バグ発生 |
|---|---|---|---|
| `"非公開（成約済み）"` | `#FFC107`（黄） | `#9e9e9e`（グレー） | ✅ あり |
| `"公開中"` | `#FFC107`（黄） | `#2196F3`（青） | ✅ あり |
| `"公開前情報あり"` | `#FFC107`（黄） | `#ff9800`（オレンジ） | ✅ あり |
| `"配信メールのみ非公開"` | `#FFC107`（黄） | `#f44336`（赤） | ✅ あり |
| `""` または `null` | `#FFC107`（黄） | `#2196F3`（青） | ✅ あり |

---

## Expected Behavior

### Preservation Requirements

**変更してはならない既存の動作:**
- マーカーの色（`getMarkerColor` 関数の動作）は変更しない
- バッジ（`Chip` コンポーネント）の表示・色は変更しない
- 「詳細を見る」ボタンをクリックした際の物件詳細ページへのナビゲーション動作は変更しない
- InfoWindowの表示・非表示の動作は変更しない
- `mapAtbbStatusToDisplayStatus` ユーティリティ関数は変更しない
- `BADGE_CONFIGS` 定数は変更しない

**スコープ:**
修正は `PropertyMapView.tsx` 内の `Button` コンポーネントの `sx.backgroundColor` プロパティ
1箇所のみに限定する。他のコンポーネントや関数には一切変更を加えない。

---

## Hypothesized Root Cause

コードを確認した結果、以下の原因が特定された：

1. **ハードコードされた固定色**: `frontend/src/components/PropertyMapView.tsx` の
   InfoWindow内 `Button` コンポーネントの `sx` プロパティで `backgroundColor: '#FFC107'`
   と固定値が設定されている（約598行目）

2. **既存ロジックの未活用**: 同ファイル内にはマーカー色を動的に決定する `getMarkerColor`
   関数と `BADGE_CONFIGS` 定数が既に実装されているが、ボタン色には適用されていない

3. **実装の不整合**: マーカー色・バッジ色は `atbb_status` に基づいて動的に変わるが、
   ボタン色だけが静的なままになっている

4. **設計上の見落とし**: InfoWindowのボタン色を実装した際に、ステータスに応じた
   色変更の要件が考慮されなかった可能性がある

---

## Correctness Properties

Property 1: Bug Condition - atbb_statusに応じたEE2ボタン色の動的変更

_For any_ `atbb_status` の値を持つ物件のInfoWindowが表示されたとき、
修正後の「詳細を見る」ボタンは以下のルールに従った `backgroundColor` を持つ SHALL:

- `atbb_status` が「非公開」を含み「配信メール」を含まない → `#9e9e9e`（グレー）
- `atbb_status` が「公開前」を含む → `#ff9800`（オレンジ）
- `atbb_status` が「配信メールのみ」を含む → `#f44336`（赤）
- 上記以外（「公開中」、空文字、null など） → `#2196F3`（青）

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - 既存動作の保持

_For any_ `atbb_status` の値を持つ物件において、修正後のコードは
マーカー色・バッジ色・ナビゲーション動作・InfoWindowの表示動作について
修正前のコードと完全に同一の動作を SHALL 保持する。

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

---

## Fix Implementation

### Changes Required

**ファイル**: `frontend/src/components/PropertyMapView.tsx`

**変更箇所**: InfoWindow内 `Button` コンポーネントの `sx` プロパティ（約590〜600行目）

**具体的な変更:**

1. **ボタン色取得ロジックの追加**: `selectedProperty.atbb_status` を
   `mapAtbbStatusToDisplayStatus` に渡して `statusType` を取得し、
   `BADGE_CONFIGS[statusType].backgroundColor` を参照する

2. **フォールバック色の設定**: `statusType === 'other'` の場合（販売中・空文字など）は
   `#2196F3`（青）をデフォルト色として使用する

3. **ホバー色の対応**: `&:hover` の `backgroundColor` も同様に動的に変更する

**変更前:**
```tsx
sx={{
  backgroundColor: '#FFC107',
  color: '#000',
  '&:hover': {
    backgroundColor: '#FFB300',
  },
}}
```

**変更後（概念）:**
```tsx
sx={{
  backgroundColor: (() => {
    const result = mapAtbbStatusToDisplayStatus(selectedProperty.atbb_status);
    return result.statusType === 'other'
      ? '#2196F3'
      : BADGE_CONFIGS[result.statusType].backgroundColor;
  })(),
  color: '#fff',
  '&:hover': {
    backgroundColor: (() => {
      const result = mapAtbbStatusToDisplayStatus(selectedProperty.atbb_status);
      if (result.statusType === 'other') return '#1976D2';
      const base = BADGE_CONFIGS[result.statusType].backgroundColor;
      return base; // ホバー色は基本色と同じ（MUIが自動でダーク化）
    })(),
  },
}}
```

**実装上の注意:**
- `BADGE_CONFIGS` と `mapAtbbStatusToDisplayStatus` は既にファイル内でインポート・定義済みのため、
  追加のインポートは不要
- `color` は `#000`（黒）から `#fff`（白）に変更する（グレー・赤・オレンジ背景での視認性確保）

---

## Testing Strategy

### Validation Approach

2フェーズのアプローチで検証する：
1. **修正前**: バグが再現することを確認（探索的テスト）
2. **修正後**: 全ステータスで正しい色が表示されること、および既存動作が保持されることを確認

### Exploratory Bug Condition Checking

**Goal**: 修正前のコードでバグが再現することを確認し、根本原因を特定する。

**Test Plan**: 各 `atbb_status` パターンに対して `getButtonColor` 相当のロジックを
テストし、固定色が返されることを確認する。

**Test Cases**:
1. **成約済み物件テスト**: `atbb_status = "非公開（成約済み）"` のとき、
   ボタン色が `#FFC107` になる（修正前は失敗するはず）
2. **販売中物件テスト**: `atbb_status = "公開中"` のとき、
   ボタン色が `#FFC107` になる（修正前は失敗するはず）
3. **公開前物件テスト**: `atbb_status = "公開前情報あり"` のとき、
   ボタン色が `#FFC107` になる（修正前は失敗するはず）
4. **非公開物件テスト**: `atbb_status = "配信メールのみ非公開"` のとき、
   ボタン色が `#FFC107` になる（修正前は失敗するはず）

**Expected Counterexamples**:
- 全ての `atbb_status` パターンで `#FFC107` が返される
- 原因: `Button` の `sx.backgroundColor` がハードコードされているため

### Fix Checking

**Goal**: 修正後のコードで全ステータスパターンにおいて正しいボタン色が返されることを確認する。

**Pseudocode:**
```
FOR ALL property WHERE isBugCondition(property) DO
  result := getButtonColor_fixed(property.atbb_status)
  ASSERT result === getExpectedButtonColor(property.atbb_status)
END FOR
```

### Preservation Checking

**Goal**: 修正によってマーカー色・バッジ色・ナビゲーション動作が変わっていないことを確認する。

**Pseudocode:**
```
FOR ALL property WHERE NOT isBugCondition(property) DO
  ASSERT getMarkerColor_original(property.atbb_status) = getMarkerColor_fixed(property.atbb_status)
  ASSERT getBadgeConfig_original(property.atbb_status) = getBadgeConfig_fixed(property.atbb_status)
END FOR
```

**Testing Approach**: プロパティベーステストを推奨する理由：
- `atbb_status` は任意の文字列であり、手動テストでは網羅しきれないエッジケースが存在する
- `mapAtbbStatusToDisplayStatus` の変換ロジックが正しく保持されることを多数のケースで検証できる
- 既存の `atbbStatusDisplayMapper.property.test.ts` のパターンを参考にできる

**Test Cases**:
1. **マーカー色保持テスト**: `getMarkerColor` の動作が修正前後で同一であることを確認
2. **バッジ設定保持テスト**: `getBadgeConfig` の動作が修正前後で同一であることを確認
3. **ナビゲーション保持テスト**: ボタンクリック時の `handlePropertyClick` 呼び出しが変わらないことを確認

### Unit Tests

- 各 `atbb_status` パターン（成約済み・販売中・公開前・非公開・空文字・null）に対して
  期待されるボタン色が返されることをテスト
- `BADGE_CONFIGS` の各エントリーに対してボタン色が一致することをテスト
- `statusType === 'other'` のときデフォルト色 `#2196F3` が使用されることをテスト

### Property-Based Tests

- ランダムな `atbb_status` 文字列を生成し、ボタン色が4色のいずれかであることを検証
- `mapAtbbStatusToDisplayStatus` の `statusType` とボタン色の対応が常に一致することを検証
- 修正前後で `getMarkerColor` と `getBadgeConfig` の出力が変わらないことを多数のケースで検証

### Integration Tests

- 成約済み物件のマーカーをクリックしてInfoWindowを開き、ボタンがグレーで表示されることを確認
- 販売中物件のマーカーをクリックしてInfoWindowを開き、ボタンが青で表示されることを確認
- 公開前物件のマーカーをクリックしてInfoWindowを開き、ボタンがオレンジで表示されることを確認
- 非公開物件のマーカーをクリックしてInfoWindowを開き、ボタンが赤で表示されることを確認
- ボタンクリック後に物件詳細ページへ正常に遷移することを確認
