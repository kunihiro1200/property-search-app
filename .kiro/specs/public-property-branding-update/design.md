# Design Document

## Overview

公開物件サイトのブランディングを更新し、青色ベースから黄色ベースのデザインに変更する。左上に当社ロゴを配置し、一貫したブランドアイデンティティを確立する。

## Design Decisions

### 1. カラーパレット

#### Primary Color (黄色)
- **Main Yellow**: `#FFC107` (Amber 500)
- **Hover State**: `#FFB300` (Amber 600)
- **Light Background**: `#FFF9C4` (Amber 100)
- **Dark Accent**: `#FFA000` (Amber 700)

#### 既存の青色から黄色への置き換え
- `--color-primary: #2563EB` → `--color-primary: #FFC107`
- `--color-primary-hover: #1D4ED8` → `--color-primary-hover: #FFB300`
- `--color-primary-light: #DBEAFE` → `--color-primary-light: #FFF9C4`

#### アクセシビリティ考慮
- 黄色の背景に黒テキスト: コントラスト比 10.4:1 (WCAG AAA)
- 黄色のボタンに黒テキスト: コントラスト比 10.4:1 (WCAG AAA)
- 白背景に黄色のアクセント: 十分なコントラストを確保

### 2. ロゴ配置

#### ロゴ仕様
- **テキスト**: "comfortable TENANT SEARCH"
- **配置**: ヘッダー左上
- **サイズ**: 
  - Desktop: 高さ 40px
  - Tablet: 高さ 36px
  - Mobile: 高さ 32px
- **フォント**: 
  - "comfortable": 筆記体風 (Pacifico または類似)
  - "TENANT SEARCH": サンセリフ (Noto Sans JP Bold)
- **カラー**: 
  - "comfortable": 黄色 (#FFC107)
  - "TENANT SEARCH": ダークグレー (#111827)

#### ロゴの動作
- クリック時: ホームページ (`/public/properties`) に遷移
- ホバー時: 軽い拡大アニメーション (scale: 1.02)
- トランジション: 200ms ease-out

### 3. ヘッダーデザイン

#### レイアウト
```
┌─────────────────────────────────────────────────┐
│ [Logo]                              [Navigation] │
│ comfortable TENANT SEARCH                        │
└─────────────────────────────────────────────────┘
```

#### スタイル
- **背景色**: 白 (#FFFFFF)
- **高さ**: 80px (Desktop), 64px (Mobile)
- **影**: `0 2px 8px rgba(0, 0, 0, 0.08)`
- **ボーダー下**: 2px solid #FFC107 (黄色のアクセント)

### 4. ヒーローセクション

#### 背景グラデーション
- **変更前**: `linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)` (青)
- **変更後**: `linear-gradient(135deg, #FFC107 0%, #FFA000 100%)` (黄色)

#### テキストカラー
- **タイトル**: ダークグレー (#111827) - 黄色背景でのコントラスト確保
- **サブタイトル**: グレー (#374151)

### 5. UI要素の色変更

#### ボタン
- **Primary Button**:
  - Background: #FFC107
  - Text: #111827
  - Hover: #FFB300
  - Shadow: `0 4px 12px rgba(255, 193, 7, 0.3)`

#### リンク
- **Default**: #FFC107
- **Hover**: #FFB300
- **Visited**: #FFA000

#### フィルターボタン
- **Selected State**:
  - Background: #FFC107
  - Border: 2px solid #FFB300
  - Text: #111827

#### 検索バー
- **Focus Border**: #FFC107
- **Icon Color**: #FFC107

### 6. レスポンシブデザイン

#### Breakpoints
- **Mobile**: < 600px
- **Tablet**: 600px - 960px
- **Desktop**: > 960px

#### ロゴのレスポンシブ対応
```css
/* Desktop */
.logo {
  height: 40px;
  padding: 20px 0;
}

/* Tablet */
@media (max-width: 960px) {
  .logo {
    height: 36px;
    padding: 14px 0;
  }
}

/* Mobile */
@media (max-width: 600px) {
  .logo {
    height: 32px;
    padding: 16px 0;
  }
}
```

## Component Changes

### 1. PublicPropertyHero.tsx
- ヒーローセクションの背景グラデーションを黄色に変更
- テキストカラーを調整（黄色背景に対応）
- ロゴを左上に追加

### 2. PublicPropertyHero.css
- `.hero-section` の background を黄色グラデーションに変更
- `.hero-title` と `.hero-subtitle` のカラーを調整
- ロゴ用のスタイルを追加

### 3. design-tokens.css
- `--color-primary` を #FFC107 に変更
- `--color-primary-hover` を #FFB300 に変更
- `--color-primary-light` を #FFF9C4 に変更
- 新しい黄色関連の変数を追加

### 4. PublicPropertiesPage.tsx
- ヘッダーセクションに黄色のアクセントを追加
- フィルターセクションの背景色を黄色に変更

### 5. PublicPropertyCard.tsx
- ホバー時のボーダーカラーを黄色に変更
- 価格表示の強調色を黄色に変更

## Animation & Transitions

### ロゴアニメーション
```css
.logo {
  transition: transform 200ms ease-out;
}

.logo:hover {
  transform: scale(1.02);
}
```

### ボタンアニメーション
```css
.primary-button {
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
}

.primary-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(255, 193, 7, 0.4);
}
```

## Accessibility Considerations

### コントラスト比
- 黄色 (#FFC107) と黒 (#111827): 10.4:1 (WCAG AAA)
- 黄色 (#FFC107) と白 (#FFFFFF): 1.8:1 (装飾用のみ)
- ダークイエロー (#FFA000) と白: 3.1:1 (WCAG AA Large Text)

### フォーカスインジケーター
- すべてのインタラクティブ要素に黄色のフォーカスリングを追加
- `outline: 2px solid #FFC107; outline-offset: 2px;`

### スクリーンリーダー対応
- ロゴに適切な alt テキストを設定
- ナビゲーション要素に aria-label を追加

## Testing Checklist

- [ ] すべてのページで黄色のブランディングが適用されている
- [ ] ロゴが正しく表示され、クリックでホームに遷移する
- [ ] レスポンシブデザインが正しく動作する（Mobile, Tablet, Desktop）
- [ ] コントラスト比がWCAG AA基準を満たしている
- [ ] すべてのボタンとリンクが黄色のスタイルを使用している
- [ ] アニメーションがスムーズに動作する
- [ ] 既存の機能が正常に動作する

## Implementation Priority

1. **High Priority**:
   - design-tokens.css の色変更
   - PublicPropertyHero の背景とロゴ追加
   - ボタンとリンクの色変更

2. **Medium Priority**:
   - フィルターセクションのスタイル更新
   - カードコンポーネントのホバー効果
   - レスポンシブ対応の調整

3. **Low Priority**:
   - アニメーションの微調整
   - 追加のアクセシビリティ改善
   - パフォーマンス最適化
