# Tasks Document

## Task Overview

公開物件サイトのブランディング更新を実装する。青色から黄色への配色変更と、左上へのロゴ追加を行う。

## Task 1: デザイントークンの更新

**Status**: Not Started  
**Priority**: High  
**Estimated Time**: 30 minutes

### Description
`frontend/src/styles/design-tokens.css` の色変数を青色から黄色に変更する。

### Acceptance Criteria
- [ ] `--color-primary` を `#FFC107` に変更
- [ ] `--color-primary-hover` を `#FFB300` に変更
- [ ] `--color-primary-light` を `#FFF9C4` に変更
- [ ] 新しい黄色関連の変数を追加（必要に応じて）
- [ ] 変更後、すべてのページで色が正しく反映されることを確認

### Files to Modify
- `frontend/src/styles/design-tokens.css`

### Implementation Steps
1. design-tokens.css を開く
2. Primary color セクションを見つける
3. 以下の変更を適用:
   ```css
   --color-primary: #FFC107;        /* Yellow - Primary actions */
   --color-primary-hover: #FFB300;  /* Darker yellow for hover states */
   --color-primary-light: #FFF9C4;  /* Light yellow for backgrounds */
   ```
4. 保存して、開発サーバーで確認

---

## Task 2: ロゴコンポーネントの作成

**Status**: Not Started  
**Priority**: High  
**Estimated Time**: 1 hour

### Description
当社ロゴを表示するReactコンポーネントを作成する。

### Acceptance Criteria
- [ ] ロゴコンポーネントが作成されている
- [ ] "comfortable TENANT SEARCH" のテキストが正しく表示される
- [ ] クリック時にホームページに遷移する
- [ ] レスポンシブデザインに対応している
- [ ] ホバー時のアニメーションが実装されている

### Files to Create
- `frontend/src/components/PublicPropertyLogo.tsx`
- `frontend/src/components/PublicPropertyLogo.css`

### Implementation Steps
1. 新しいコンポーネントファイルを作成
2. ロゴのマークアップを実装:
   ```tsx
   import React from 'react';
   import { useNavigate } from 'react-router-dom';
   import './PublicPropertyLogo.css';

   const PublicPropertyLogo: React.FC = () => {
     const navigate = useNavigate();

     const handleClick = () => {
       navigate('/public/properties');
     };

     return (
       <div className="public-property-logo" onClick={handleClick}>
         <span className="logo-comfortable">comfortable</span>
         <span className="logo-tenant-search">TENANT SEARCH</span>
       </div>
     );
   };

   export default PublicPropertyLogo;
   ```
3. CSSスタイルを実装
4. レスポンシブ対応を追加
5. ホバーアニメーションを追加

---

## Task 3: ヘッダーコンポーネントの作成

**Status**: Not Started  
**Priority**: High  
**Estimated Time**: 1.5 hours

### Description
ロゴを含む共通ヘッダーコンポーネントを作成する。

### Acceptance Criteria
- [ ] ヘッダーコンポーネントが作成されている
- [ ] ロゴが左上に配置されている
- [ ] 白背景に黄色のボーダーが適用されている
- [ ] レスポンシブデザインに対応している
- [ ] すべての公開物件ページで使用できる

### Files to Create
- `frontend/src/components/PublicPropertyHeader.tsx`
- `frontend/src/components/PublicPropertyHeader.css`

### Implementation Steps
1. 新しいヘッダーコンポーネントを作成
2. PublicPropertyLogo コンポーネントをインポート
3. レイアウトを実装（左にロゴ、右にナビゲーション用のスペース）
4. スタイルを実装:
   - 白背景
   - 下部に黄色のボーダー (2px solid #FFC107)
   - 適切な影とパディング
5. レスポンシブ対応を追加

---

## Task 4: ヒーローセクションの背景色変更

**Status**: Not Started  
**Priority**: High  
**Estimated Time**: 30 minutes

### Description
PublicPropertyHero コンポーネントの背景グラデーションを青色から黄色に変更する。

### Acceptance Criteria
- [ ] 背景グラデーションが黄色に変更されている
- [ ] テキストカラーが黄色背景に適したものに調整されている
- [ ] コントラスト比がWCAG AA基準を満たしている
- [ ] レスポンシブデザインが維持されている

### Files to Modify
- `frontend/src/components/PublicPropertyHero.css`

### Implementation Steps
1. PublicPropertyHero.css を開く
2. `.hero-section` の background を変更:
   ```css
   background: linear-gradient(135deg, #FFC107 0%, #FFA000 100%);
   ```
3. `.hero-title` のカラーを調整:
   ```css
   color: #111827; /* ダークグレー */
   ```
4. `.hero-subtitle` のカラーを調整:
   ```css
   color: #374151; /* グレー */
   ```
5. 保存して確認

---

## Task 5: ヘッダーの統合

**Status**: Not Started  
**Priority**: High  
**Estimated Time**: 1 hour

### Description
作成したヘッダーコンポーネントをすべての公開物件ページに統合する。

### Acceptance Criteria
- [ ] PublicPropertiesPage にヘッダーが追加されている
- [ ] PublicPropertyDetailPage にヘッダーが追加されている
- [ ] ヘッダーが正しく表示され、機能している
- [ ] 既存のレイアウトが崩れていない

### Files to Modify
- `frontend/src/pages/PublicPropertiesPage.tsx`
- `frontend/src/pages/PublicPropertyDetailPage.tsx`

### Implementation Steps
1. PublicPropertyHeader をインポート
2. 各ページの最上部にヘッダーを追加
3. 既存のヒーローセクションとの統合を確認
4. レイアウトの調整（必要に応じて）

---

## Task 6: ボタンスタイルの更新

**Status**: Not Started  
**Priority**: Medium  
**Estimated Time**: 45 minutes

### Description
すべてのプライマリボタンのスタイルを黄色に変更する。

### Acceptance Criteria
- [ ] すべてのプライマリボタンが黄色背景になっている
- [ ] ホバー時の色が適切に変更されている
- [ ] テキストカラーが読みやすい（黒 #111827）
- [ ] ボタンの影が黄色に調整されている

### Files to Modify
- `frontend/src/components/PublicPropertyCard.css`
- `frontend/src/components/PublicPropertyFilters.tsx` (スタイル部分)
- `frontend/src/pages/PublicPropertiesPage.tsx` (ボタンスタイル)

### Implementation Steps
1. 各ファイルでボタンのスタイルを確認
2. Material-UI の Button コンポーネントに sx prop を追加:
   ```tsx
   <Button
     variant="contained"
     sx={{
       bgcolor: '#FFC107',
       color: '#111827',
       '&:hover': {
         bgcolor: '#FFB300',
       },
     }}
   >
     ボタンテキスト
   </Button>
   ```
3. カスタムCSSクラスを使用している場合は、CSSファイルを更新
4. すべてのボタンで統一されたスタイルを確認

---

## Task 7: リンクとアクセント色の更新

**Status**: Not Started  
**Priority**: Medium  
**Estimated Time**: 30 minutes

### Description
リンクやアクセント要素の色を黄色に変更する。

### Acceptance Criteria
- [ ] すべてのリンクが黄色になっている
- [ ] ホバー時の色が適切に変更されている
- [ ] アクセント要素（アイコン、ボーダーなど）が黄色になっている

### Files to Modify
- `frontend/src/components/PublicPropertyCard.css`
- `frontend/src/components/UnifiedSearchBar.css` (存在する場合)
- その他、リンクやアクセントを含むコンポーネント

### Implementation Steps
1. 各CSSファイルでリンクのスタイルを検索
2. 色を #FFC107 に変更
3. ホバー時の色を #FFB300 に変更
4. アイコンやボーダーの色も同様に更新

---

## Task 8: フィルターセクションのスタイル更新

**Status**: Not Started  
**Priority**: Medium  
**Estimated Time**: 45 minutes

### Description
PublicPropertiesPage のフィルターセクションのヘッダー背景を黄色に変更する。

### Acceptance Criteria
- [ ] フィルターセクションのヘッダー背景が黄色になっている
- [ ] テキストカラーが適切に調整されている
- [ ] 選択状態のフィルターボタンが黄色になっている

### Files to Modify
- `frontend/src/pages/PublicPropertiesPage.tsx`
- `frontend/src/components/PropertyTypeFilterButtons.tsx` (存在する場合)

### Implementation Steps
1. PublicPropertiesPage.tsx を開く
2. フィルターセクションのヘッダー部分を見つける
3. backgroundColor を変更:
   ```tsx
   <Box
     sx={{
       backgroundColor: '#FFC107',
       color: '#111827',
       p: 2,
     }}
   >
   ```
4. フィルターボタンの選択状態のスタイルを更新
5. 保存して確認

---

## Task 9: PropertyCard のホバー効果更新

**Status**: Not Started  
**Priority**: Low  
**Estimated Time**: 30 minutes

### Description
PublicPropertyCard のホバー時のボーダーやシャドウを黄色に変更する。

### Acceptance Criteria
- [ ] ホバー時のボーダーが黄色になっている
- [ ] ホバー時のシャドウが黄色のアクセントを含んでいる
- [ ] アニメーションがスムーズに動作している

### Files to Modify
- `frontend/src/components/PublicPropertyCard.css`

### Implementation Steps
1. PublicPropertyCard.css を開く
2. `.property-card:hover` のスタイルを更新:
   ```css
   .property-card:hover {
     border: 2px solid #FFC107;
     box-shadow: 0 8px 24px rgba(255, 193, 7, 0.2);
     transform: translateY(-4px);
   }
   ```
3. トランジションを確認
4. 保存して確認

---

## Task 10: レスポンシブデザインのテスト

**Status**: Not Started  
**Priority**: High  
**Estimated Time**: 1 hour

### Description
すべての変更がモバイル、タブレット、デスクトップで正しく表示されることを確認する。

### Acceptance Criteria
- [ ] モバイル（< 600px）で正しく表示される
- [ ] タブレット（600px - 960px）で正しく表示される
- [ ] デスクトップ（> 960px）で正しく表示される
- [ ] ロゴのサイズが各デバイスで適切である
- [ ] すべてのUI要素が正しく機能する

### Testing Steps
1. Chrome DevTools を開く
2. デバイスツールバーを有効にする
3. 各ブレークポイントでテスト:
   - iPhone SE (375px)
   - iPad (768px)
   - Desktop (1280px)
4. 以下を確認:
   - ロゴの表示とサイズ
   - ヘッダーのレイアウト
   - ボタンとリンクの表示
   - カードのレイアウト
   - フィルターセクションの表示
5. 問題があれば修正

---

## Task 11: アクセシビリティの確認

**Status**: Not Started  
**Priority**: Medium  
**Estimated Time**: 45 minutes

### Description
色のコントラスト比とキーボードナビゲーションを確認する。

### Acceptance Criteria
- [ ] すべてのテキストがWCAG AA基準のコントラスト比を満たしている
- [ ] フォーカスインジケーターが適切に表示される
- [ ] キーボードですべての要素にアクセスできる
- [ ] スクリーンリーダーで適切に読み上げられる

### Testing Steps
1. Chrome DevTools の Lighthouse を実行
2. Accessibility スコアを確認
3. コントラスト比の問題を修正
4. キーボードで Tab キーを使用してナビゲーションをテスト
5. フォーカスインジケーターが見えることを確認
6. 必要に応じて aria-label を追加

---

## Task 12: 既存機能のリグレッションテスト

**Status**: Not Started  
**Priority**: High  
**Estimated Time**: 1 hour

### Description
すべての既存機能が正常に動作することを確認する。

### Acceptance Criteria
- [ ] 検索機能が正常に動作する
- [ ] フィルター機能が正常に動作する
- [ ] ページネーションが正常に動作する
- [ ] 物件詳細ページへの遷移が正常に動作する
- [ ] すべてのリンクとボタンが機能する

### Testing Steps
1. 公開物件一覧ページを開く
2. 検索バーで検索を実行
3. 各フィルターを試す
4. ページネーションをテスト
5. 物件カードをクリックして詳細ページに遷移
6. ロゴをクリックしてホームに戻る
7. すべての機能が正常に動作することを確認

---

## Task 13: ドキュメントの更新

**Status**: Not Started  
**Priority**: Low  
**Estimated Time**: 30 minutes

### Description
実装完了後、関連ドキュメントを更新する。

### Acceptance Criteria
- [ ] README に新しいブランディングについて記載されている
- [ ] スタイルガイドが更新されている（存在する場合）
- [ ] 実装完了レポートが作成されている

### Files to Create/Modify
- `.kiro/specs/public-property-branding-update/IMPLEMENTATION_COMPLETE.md`
- `README.md` (必要に応じて)

### Implementation Steps
1. 実装完了レポートを作成
2. 変更内容をまとめる
3. スクリーンショットを追加（推奨）
4. テスト結果を記載
5. 既知の問題や今後の改善点を記載

---

## Task Dependencies

```
Task 1 (デザイントークン) → Task 4, 6, 7, 8, 9
Task 2 (ロゴ) → Task 3 (ヘッダー) → Task 5 (統合)
Task 5 → Task 10 (レスポンシブテスト)
All Tasks → Task 11 (アクセシビリティ), Task 12 (リグレッションテスト)
Task 12 → Task 13 (ドキュメント)
```

## Estimated Total Time

- High Priority Tasks: 6.5 hours
- Medium Priority Tasks: 2.5 hours
- Low Priority Tasks: 1 hour
- **Total**: 10 hours

## Implementation Order

1. Task 1: デザイントークンの更新
2. Task 2: ロゴコンポーネントの作成
3. Task 3: ヘッダーコンポーネントの作成
4. Task 4: ヒーローセクションの背景色変更
5. Task 5: ヘッダーの統合
6. Task 6: ボタンスタイルの更新
7. Task 7: リンクとアクセント色の更新
8. Task 8: フィルターセクションのスタイル更新
9. Task 9: PropertyCard のホバー効果更新
10. Task 10: レスポンシブデザインのテスト
11. Task 11: アクセシビリティの確認
12. Task 12: 既存機能のリグレッションテスト
13. Task 13: ドキュメントの更新
