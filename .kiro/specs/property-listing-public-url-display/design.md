# 物件リスト公開URL表示機能 - 設計書

## アーキテクチャ

### システム構成
```
┌─────────────────────────────────────────┐
│ PropertyListingsPage.tsx                │
│ ┌─────────────────────────────────────┐ │
│ │ Table                               │ │
│ │ ┌─────────────────────────────────┐ │ │
│ │ │ PublicUrlCell Component         │ │ │
│ │ │ - URL表示                       │ │ │
│ │ │ - コピーボタン                  │ │ │
│ │ │ - ツールチップ                  │ │ │
│ │ └─────────────────────────────────┘ │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
              ↓ uses
┌─────────────────────────────────────────┐
│ publicUrlGenerator.ts                   │
│ - generatePublicPropertyUrl()           │
│ - isPublicProperty()                    │
└─────────────────────────────────────────┘
```

## データフロー

### URL生成フロー
```
1. PropertyListingsPage
   ↓ property data (id, atbb_status)
2. generatePublicPropertyUrl()
   ↓ check atbb_status
3. Return URL or null
   ↓
4. Display in table cell
```

### コピーフロー
```
1. User clicks copy button
   ↓
2. navigator.clipboard.writeText(url)
   ↓
3. Show toast notification
   ↓
4. Auto-hide after 3 seconds
```

## コンポーネント設計

### PublicUrlCell Component

#### Props
```typescript
interface PublicUrlCellProps {
  propertyId: string;
  atbbStatus: string | null;
  onCopy?: (url: string) => void;
}
```

#### State
```typescript
const [copied, setCopied] = useState(false);
```

#### Methods
```typescript
const handleCopy = async () => {
  const url = generatePublicPropertyUrl(propertyId, atbbStatus);
  if (!url) return;
  
  try {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    showToast('URLをコピーしました');
    setTimeout(() => setCopied(false), 3000);
  } catch (error) {
    showToast('コピーに失敗しました', 'error');
  }
};
```

#### Render
```tsx
{url ? (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    <Tooltip title={url}>
      <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
        {truncateUrl(url)}
      </Typography>
    </Tooltip>
    <IconButton size="small" onClick={handleCopy}>
      {copied ? <CheckIcon /> : <ContentCopyIcon />}
    </IconButton>
  </Box>
) : (
  <Typography variant="body2" color="text.secondary">-</Typography>
)}
```

## ユーティリティ関数

### publicUrlGenerator.ts

```typescript
/**
 * 公開物件サイトのURLを生成
 * @param propertyId 物件ID（UUID）
 * @param atbbStatus ATBB状況
 * @returns 公開URL（公開中の場合）またはnull
 */
export const generatePublicPropertyUrl = (
  propertyId: string,
  atbbStatus: string | null
): string | null => {
  if (!isPublicProperty(atbbStatus)) {
    return null;
  }
  
  const baseUrl = getBaseUrl();
  return `${baseUrl}/public/properties/${propertyId}`;
};

/**
 * 公開中の物件かどうかを判定
 * @param atbbStatus ATBB状況
 * @returns 公開中の場合true
 */
export const isPublicProperty = (atbbStatus: string | null): boolean => {
  return atbbStatus === '専任・公開中';
};

/**
 * ベースURLを取得
 * @returns ベースURL
 */
const getBaseUrl = (): string => {
  // 環境変数から取得（本番環境用）
  if (import.meta.env.VITE_APP_URL) {
    return import.meta.env.VITE_APP_URL;
  }
  
  // 開発環境ではwindow.location.originを使用
  return window.location.origin;
};

/**
 * URLを短縮表示用にトリミング
 * @param url 完全URL
 * @param maxLength 最大文字数
 * @returns 短縮URL
 */
export const truncateUrl = (url: string, maxLength: number = 30): string => {
  if (url.length <= maxLength) {
    return url;
  }
  
  // 末尾を表示（物件IDが見えるように）
  const suffix = url.slice(-maxLength + 3);
  return `...${suffix}`;
};
```

## UI設計

### テーブルカラム追加

#### 挿入位置
「ステータス」カラムの前に挿入

#### カラム定義
```tsx
<TableCell>公開URL</TableCell>
```

#### セル実装
```tsx
<TableCell onClick={(e) => e.stopPropagation()}>
  <PublicUrlCell
    propertyId={listing.id}
    atbbStatus={listing.atbb_status}
  />
</TableCell>
```

### レスポンシブ対応
- デスクトップ: 完全表示
- タブレット: 短縮表示
- モバイル: 非表示（詳細画面で確認）

## スタイリング

### Material-UI Theme
```typescript
const styles = {
  urlCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    maxWidth: 200,
  },
  urlText: {
    maxWidth: 150,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
  },
  copyButton: {
    padding: 0.5,
    '&:hover': {
      backgroundColor: 'action.hover',
    },
  },
  copiedIcon: {
    color: 'success.main',
  },
};
```

## エラーハンドリング

### コピー失敗時
```typescript
try {
  await navigator.clipboard.writeText(url);
} catch (error) {
  console.error('Failed to copy URL:', error);
  
  // フォールバック: テキストエリアを使用
  const textarea = document.createElement('textarea');
  textarea.value = url;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  
  showToast('URLをコピーしました');
}
```

### 無効なプロパティID
```typescript
if (!propertyId || !isValidUUID(propertyId)) {
  console.warn('Invalid property ID:', propertyId);
  return null;
}
```

## パフォーマンス最適化

### メモ化
```typescript
const publicUrl = useMemo(
  () => generatePublicPropertyUrl(propertyId, atbbStatus),
  [propertyId, atbbStatus]
);
```

### 遅延レンダリング
- 初期表示時は最初の50件のみURL生成
- スクロール時に追加生成

## セキュリティ考慮事項

### XSS対策
- URLは動的生成のため、ユーザー入力を含まない
- Material-UIのコンポーネントを使用（自動エスケープ）

### CSRF対策
- 読み取り専用機能のため不要

## テスト戦略

### 単体テスト
```typescript
describe('publicUrlGenerator', () => {
  describe('generatePublicPropertyUrl', () => {
    it('公開中の物件のURLを生成', () => {
      const url = generatePublicPropertyUrl('abc-123', '専任・公開中');
      expect(url).toContain('/public/properties/abc-123');
    });
    
    it('非公開物件はnullを返す', () => {
      const url = generatePublicPropertyUrl('abc-123', '契約済');
      expect(url).toBeNull();
    });
  });
  
  describe('truncateUrl', () => {
    it('長いURLを短縮', () => {
      const url = 'https://example.com/public/properties/very-long-id-123';
      const truncated = truncateUrl(url, 30);
      expect(truncated).toMatch(/^\.\.\./);
      expect(truncated.length).toBeLessThanOrEqual(30);
    });
  });
});
```

### 統合テスト
```typescript
describe('PropertyListingsPage', () => {
  it('公開中物件にURLが表示される', async () => {
    render(<PropertyListingsPage />);
    
    const urlCell = await screen.findByText(/\/public\/properties\//);
    expect(urlCell).toBeInTheDocument();
  });
  
  it('コピーボタンでURLがコピーされる', async () => {
    render(<PropertyListingsPage />);
    
    const copyButton = screen.getByLabelText('URLをコピー');
    await userEvent.click(copyButton);
    
    const copiedText = await navigator.clipboard.readText();
    expect(copiedText).toContain('/public/properties/');
  });
});
```

## 環境変数

### .env設定
```bash
# フロントエンド
VITE_APP_URL=https://your-domain.com

# 本番環境
VITE_APP_URL=https://production-domain.com
```

## デプロイメント

### ビルド時の確認事項
1. 環境変数が正しく設定されているか
2. ベースURLが本番環境のドメインになっているか
3. HTTPSが有効になっているか

### ロールバック計画
- フロントエンドのみの変更のため、即座にロールバック可能
- DBスキーマ変更なし

## モニタリング

### メトリクス
- URL生成エラー率
- コピー成功率
- コピー失敗率

### ログ
```typescript
console.log('[PublicUrl] Generated URL:', url);
console.error('[PublicUrl] Failed to copy:', error);
```

## ドキュメント

### ユーザーガイド
1. 物件リスト画面で「公開URL」カラムを確認
2. コピーボタンをクリックしてURLをコピー
3. 顧客にURLを共有

### 開発者ガイド
1. `publicUrlGenerator.ts`でURL生成ロジックを管理
2. `PublicUrlCell`コンポーネントで表示を管理
3. 環境変数でベースURLを設定
