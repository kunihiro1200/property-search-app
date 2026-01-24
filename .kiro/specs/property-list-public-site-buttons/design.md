# 物件リスト 公開サイトボタン追加機能 - 設計書

## 1. 設計概要

物件リストページ（`PropertyListingsPage.tsx`）のヘッダー部分に、公開物件サイトへのアクセスボタンを2つ追加します。

## 2. アーキテクチャ

### 2.1 コンポーネント構成

```
PropertyListingsPage.tsx
├── PageNavigation (既存)
└── PublicSiteButtons (新規コンポーネント)
    ├── 一般向け公開サイトボタン
    └── 管理者向け公開サイトボタン
```

### 2.2 新規コンポーネント

#### PublicSiteButtons.tsx

**責務**:
- 公開サイトへのアクセスボタンを2つ表示
- 新しいタブでリンクを開く
- レスポンシブデザインに対応

**Props**:
```typescript
interface PublicSiteButtonsProps {
  // Propsなし（静的なボタン）
}
```

## 3. 詳細設計

### 3.1 ファイル構成

```
frontend/src/
├── components/
│   └── PublicSiteButtons.tsx (新規)
└── pages/
    └── PropertyListingsPage.tsx (修正)
```

### 3.2 PublicSiteButtons.tsx の実装

```typescript
import { Box, Button } from '@mui/material';
import { Public as PublicIcon, AdminPanelSettings as AdminIcon } from '@mui/icons-material';

export default function PublicSiteButtons() {
  const handleOpenPublicSite = () => {
    window.open('/public/properties', '_blank', 'noopener,noreferrer');
  };

  const handleOpenAdminSite = () => {
    window.open('/public/properties?canHide=true', '_blank', 'noopener,noreferrer');
  };

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'center' },
      }}
    >
      <Button
        variant="outlined"
        color="primary"
        startIcon={<PublicIcon />}
        onClick={handleOpenPublicSite}
        aria-label="一般向け公開サイトを開く"
        sx={{ whiteSpace: 'nowrap' }}
      >
        一般向け公開サイト
      </Button>
      
      <Button
        variant="contained"
        color="secondary"
        startIcon={<AdminIcon />}
        onClick={handleOpenAdminSite}
        aria-label="管理者向け公開サイトを開く"
        sx={{ whiteSpace: 'nowrap' }}
      >
        管理者向け公開サイト
      </Button>
    </Box>
  );
}
```

### 3.3 PropertyListingsPage.tsx の修正

**修正箇所**: ヘッダー部分（`PageNavigation`の直後）

```typescript
// インポート追加
import PublicSiteButtons from '../components/PublicSiteButtons';

// JSX修正（行340付近）
return (
  <Container maxWidth="xl" sx={{ py: 3 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Typography variant="h5" fontWeight="bold">物件リスト</Typography>
      <PublicSiteButtons />
    </Box>
    
    {/* ページナビゲーション */}
    <PageNavigation />
    
    {/* 以下既存のコード */}
    ...
  </Container>
);
```

## 4. UI/UXデザイン

### 4.1 レイアウト

#### デスクトップ表示（md以上）

```
┌─────────────────────────────────────────────────────────────┐
│ 物件リスト          [一般向け公開サイト] [管理者向け公開サイト] │
├─────────────────────────────────────────────────────────────┤
│ PageNavigation                                               │
├─────────────────────────────────────────────────────────────┤
│ [フィルター]  [メインコンテンツ]                              │
└─────────────────────────────────────────────────────────────┘
```

#### モバイル表示（sm以下）

```
┌──────────────────────┐
│ 物件リスト            │
│ [一般向け公開サイト]  │
│ [管理者向け公開サイト]│
├──────────────────────┤
│ PageNavigation       │
├──────────────────────┤
│ [メインコンテンツ]    │
└──────────────────────┘
```

### 4.2 ボタンのスタイル

#### 一般向け公開サイトボタン
- **バリアント**: `outlined`
- **カラー**: `primary`（青色）
- **アイコン**: `PublicIcon`（地球儀アイコン）
- **ラベル**: 「一般向け公開サイト」

#### 管理者向け公開サイトボタン
- **バリアント**: `contained`
- **カラー**: `secondary`（オレンジ色）
- **アイコン**: `AdminPanelSettingsIcon`（管理者アイコン）
- **ラベル**: 「管理者向け公開サイト」

### 4.3 レスポンシブ対応

```typescript
sx={{
  display: 'flex',
  gap: 2,
  flexDirection: { xs: 'column', sm: 'row' }, // モバイルは縦並び
  alignItems: { xs: 'stretch', sm: 'center' }, // モバイルは幅いっぱい
}}
```

## 5. 動作フロー

### 5.1 一般向け公開サイトボタンのクリック

```
ユーザー
  ↓ クリック
[一般向け公開サイト]ボタン
  ↓ window.open()
新しいタブで /public/properties を開く
  ↓
公開物件サイト（一般向け）が表示される
```

### 5.2 管理者向け公開サイトボタンのクリック

```
ユーザー
  ↓ クリック
[管理者向け公開サイト]ボタン
  ↓ window.open()
新しいタブで /public/properties?canHide=true を開く
  ↓
公開物件サイト（管理者向け）が表示される
  ↓
ログイン済みの場合、管理者機能が利用可能
```

## 6. セキュリティ考慮事項

### 6.1 XSS対策
- `window.open()`の第3引数に`noopener,noreferrer`を指定
- 新しいタブからの`window.opener`アクセスを防止

### 6.2 認証
- ボタン自体は認証不要（誰でも表示される）
- 管理者向けサイトの機能は、公開サイト側で認証チェック済み
- `?canHide=true`パラメータだけでは管理者機能は使えない（ログインが必要）

## 7. パフォーマンス考慮事項

### 7.1 コンポーネントの最適化
- `PublicSiteButtons`は静的なコンポーネント（状態なし）
- 再レンダリングの影響は最小限

### 7.2 バンドルサイズ
- 新規コンポーネントは約50行程度
- Material-UIのアイコンは既に他の場所で使用されているため、追加のバンドルサイズ増加なし

## 8. アクセシビリティ

### 8.1 キーボード操作
- ボタンは`Tab`キーでフォーカス可能
- `Enter`キーまたは`Space`キーで実行

### 8.2 スクリーンリーダー対応
- `aria-label`属性を設定
- ボタンのラベルは明確で理解しやすい

### 8.3 カラーコントラスト
- Material-UIのデフォルトカラーを使用（WCAG AA準拠）

## 9. テスト戦略

### 9.1 単体テスト（Jest + React Testing Library）

```typescript
// PublicSiteButtons.test.tsx
describe('PublicSiteButtons', () => {
  it('一般向け公開サイトボタンが表示される', () => {
    render(<PublicSiteButtons />);
    expect(screen.getByText('一般向け公開サイト')).toBeInTheDocument();
  });

  it('管理者向け公開サイトボタンが表示される', () => {
    render(<PublicSiteButtons />);
    expect(screen.getByText('管理者向け公開サイト')).toBeInTheDocument();
  });

  it('一般向けボタンをクリックすると新しいタブで開く', () => {
    const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation();
    render(<PublicSiteButtons />);
    
    fireEvent.click(screen.getByText('一般向け公開サイト'));
    
    expect(windowOpenSpy).toHaveBeenCalledWith(
      '/public/properties',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('管理者向けボタンをクリックすると新しいタブで開く', () => {
    const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation();
    render(<PublicSiteButtons />);
    
    fireEvent.click(screen.getByText('管理者向け公開サイト'));
    
    expect(windowOpenSpy).toHaveBeenCalledWith(
      '/public/properties?canHide=true',
      '_blank',
      'noopener,noreferrer'
    );
  });
});
```

### 9.2 E2Eテスト（手動）

1. **デスクトップ表示**:
   - 物件リストページを開く
   - 2つのボタンが横並びで表示されることを確認
   - 各ボタンをクリックして新しいタブで開くことを確認

2. **モバイル表示**:
   - ブラウザの開発者ツールでモバイル表示に切り替え
   - 2つのボタンが縦並びで表示されることを確認
   - 各ボタンをクリックして新しいタブで開くことを確認

3. **アクセシビリティ**:
   - キーボードのみで操作できることを確認
   - スクリーンリーダーで読み上げられることを確認

## 10. 実装の優先順位

### Phase 1: 基本機能（必須）
1. `PublicSiteButtons.tsx`コンポーネントの作成
2. `PropertyListingsPage.tsx`への統合
3. デスクトップ表示の実装

### Phase 2: レスポンシブ対応（必須）
1. モバイル表示の実装
2. タブレット表示の調整

### Phase 3: テスト（推奨）
1. 単体テストの作成
2. E2Eテストの実施

### Phase 4: 改善（オプション）
1. ホバーエフェクトの追加
2. アニメーションの追加

## 11. 正確性プロパティ（Property-Based Testing）

### 11.1 プロパティ1: ボタンは常に表示される

**プロパティ**: 物件リストページを開いた時、2つのボタンが常に表示される

**検証方法**:
```typescript
// 任意の画面サイズで
// 任意のログイン状態で
// 任意のフィルター条件で
// → 2つのボタンが表示される
```

**テスト**:
```typescript
describe('Property: ボタンは常に表示される', () => {
  it.each([
    { width: 1920, height: 1080 }, // デスクトップ
    { width: 768, height: 1024 },  // タブレット
    { width: 375, height: 667 },   // モバイル
  ])('画面サイズ $width x $height でボタンが表示される', ({ width, height }) => {
    window.innerWidth = width;
    window.innerHeight = height;
    
    render(<PropertyListingsPage />);
    
    expect(screen.getByText('一般向け公開サイト')).toBeInTheDocument();
    expect(screen.getByText('管理者向け公開サイト')).toBeInTheDocument();
  });
});
```

### 11.2 プロパティ2: ボタンをクリックすると新しいタブで開く

**プロパティ**: どのボタンをクリックしても、必ず新しいタブで開く

**検証方法**:
```typescript
// 任意のボタンをクリック
// → window.open()が呼ばれる
// → 第2引数は'_blank'
// → 第3引数は'noopener,noreferrer'
```

**テスト**:
```typescript
describe('Property: ボタンをクリックすると新しいタブで開く', () => {
  it.each([
    { label: '一般向け公開サイト', url: '/public/properties' },
    { label: '管理者向け公開サイト', url: '/public/properties?canHide=true' },
  ])('$label ボタンをクリックすると新しいタブで開く', ({ label, url }) => {
    const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation();
    render(<PublicSiteButtons />);
    
    fireEvent.click(screen.getByText(label));
    
    expect(windowOpenSpy).toHaveBeenCalledWith(url, '_blank', 'noopener,noreferrer');
  });
});
```

### 11.3 プロパティ3: レスポンシブデザインが正しく動作する

**プロパティ**: 画面サイズに応じて、ボタンのレイアウトが変わる

**検証方法**:
```typescript
// 画面幅 >= 600px (sm以上)
// → ボタンは横並び (flexDirection: 'row')

// 画面幅 < 600px (xs)
// → ボタンは縦並び (flexDirection: 'column')
```

**テスト**:
```typescript
describe('Property: レスポンシブデザインが正しく動作する', () => {
  it('デスクトップ表示ではボタンが横並び', () => {
    window.innerWidth = 1024;
    render(<PublicSiteButtons />);
    
    const container = screen.getByRole('group'); // Box要素
    expect(container).toHaveStyle({ flexDirection: 'row' });
  });

  it('モバイル表示ではボタンが縦並び', () => {
    window.innerWidth = 375;
    render(<PublicSiteButtons />);
    
    const container = screen.getByRole('group'); // Box要素
    expect(container).toHaveStyle({ flexDirection: 'column' });
  });
});
```

## 12. エッジケース

### 12.1 ポップアップブロッカー

**問題**: ブラウザのポップアップブロッカーが有効な場合、`window.open()`が失敗する可能性がある

**対策**: 
- ユーザーのクリックイベントから直接`window.open()`を呼び出す（非同期処理を挟まない）
- これにより、ほとんどのブラウザでポップアップブロッカーを回避できる

### 12.2 非常に長いラベル

**問題**: 翻訳や多言語対応で、ラベルが非常に長くなる可能性がある

**対策**:
- `whiteSpace: 'nowrap'`を設定してラベルを1行に保つ
- 必要に応じて`overflow: 'hidden'`と`textOverflow: 'ellipsis'`を追加

### 12.3 低速なネットワーク

**問題**: 新しいタブで開いたページの読み込みが遅い

**対策**:
- 公開サイト側でローディング表示を実装済み
- ボタン側では特別な対策は不要

## 13. 今後の拡張性

### 13.1 ボタンの追加

将来的に他のボタンを追加する場合:
- `PublicSiteButtons.tsx`にボタンを追加
- または、新しいコンポーネントを作成して並べる

### 13.2 権限による表示制御

将来的に権限による表示制御が必要な場合:
- `PublicSiteButtons.tsx`にPropsを追加
- 例: `showAdminButton?: boolean`

### 13.3 カスタマイズ

将来的にボタンのカスタマイズが必要な場合:
- Propsでラベルやアイコンを変更可能にする
- 例: `publicLabel?: string`, `adminLabel?: string`

## 14. 関連ドキュメント

- [要件定義](./requirements.md)
- [公開物件サイト 手動更新ボタン実装記録](../../steering/public-property-manual-refresh-implementation.md)
- [ローカル管理者ログインガイド](../../steering/local-admin-login-guide.md)

## 15. 承認

- [ ] 設計の承認
- [ ] 実装の承認

---

**作成日**: 2026年1月25日  
**作成者**: Kiro AI Assistant  
**ステータス**: レビュー待ち
