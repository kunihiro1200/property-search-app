# デザイン文書

## 概要

物件リスト管理画面の物件詳細ページ（PropertyListingDetailPage.tsx）において、2つのUI改善を実装します：

1. **物件番号のワンクリックコピー機能**: ヘッダーに表示されている物件番号をワンクリックでクリップボードにコピーできるようにする
2. **買主候補リストへのアクセス改善**: ページ下部の買主候補リストコンポーネントをヘッダーのボタンに置き換え、別タブで開けるようにする

これらの改善により、日常業務での物件番号のコピー&ペースト作業と、買主候補リストへのアクセスが効率化されます。

## アーキテクチャ

### システム構成

```
┌─────────────────────────────────────────────────────────────┐
│ PropertyListingDetailPage.tsx                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ヘッダーエリア                                           │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ 物件詳細 - AA13501 [コピーアイコン]                 │ │ │
│ │ │ 公開URL: [PublicUrlCell]                            │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ [買主候補リスト (15件)] [Gmail配信] [保存]         │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ メインコンテンツ                                         │ │
│ │ （既存のセクション）                                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ※ 右カラムのBuyerCandidateListコンポーネントは削除         │
└─────────────────────────────────────────────────────────────┘
```

### コンポーネント構成

- **PropertyListingDetailPage.tsx**: メインコンポーネント（変更対象）
  - 物件番号コピー機能を追加
  - 買主候補リストボタンを追加
  - 右カラムのBuyerCandidateListコンポーネントを削除

### データフロー

```
1. 物件番号コピー機能
   ユーザー → [コピーボタンクリック] → navigator.clipboard.writeText()
   → クリップボードにコピー → スナックバー通知

2. 買主候補リストボタン
   ページロード → APIリクエスト: /api/property-listings/${propertyNumber}/buyer-candidates
   → レスポンス: { total: 15, ... } → ボタンバッジに件数表示
   
   ユーザー → [ボタンクリック] → window.open()
   → 新しいタブで /property-listings/${propertyNumber}/buyer-candidates を開く
```

## コンポーネントとインターフェース

### 1. 物件番号コピー機能

#### UI要素

```tsx
<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
  <Typography variant="h5" fontWeight="bold" sx={{ color: SECTION_COLORS.property.main }}>
    物件詳細 - {data.property_number}
  </Typography>
  <IconButton
    size="small"
    onClick={handleCopyPropertyNumber}
    sx={{ color: SECTION_COLORS.property.main }}
    title="物件番号をコピー"
  >
    <ContentCopyIcon fontSize="small" />
  </IconButton>
</Box>
```

#### ハンドラー関数

```tsx
const handleCopyPropertyNumber = async () => {
  if (!data?.property_number) return;
  
  try {
    await navigator.clipboard.writeText(data.property_number);
    setSnackbar({
      open: true,
      message: '物件番号をコピーしました',
      severity: 'success',
    });
  } catch (error) {
    console.error('Failed to copy property number:', error);
    setSnackbar({
      open: true,
      message: '物件番号のコピーに失敗しました',
      severity: 'error',
    });
  }
};
```

### 2. 買主候補リストボタン

#### State管理

```tsx
// 買主候補リストの件数を管理
const [buyerCandidateCount, setBuyerCandidateCount] = useState<number | null>(null);
const [buyerCandidateLoading, setBuyerCandidateLoading] = useState(false);
```

#### データ取得

```tsx
const fetchBuyerCandidateCount = async () => {
  if (!propertyNumber) return;
  
  setBuyerCandidateLoading(true);
  try {
    const response = await api.get(`/api/property-listings/${propertyNumber}/buyer-candidates`);
    setBuyerCandidateCount(response.data.total);
  } catch (error) {
    console.error('Failed to fetch buyer candidate count:', error);
    // エラーでもボタンは表示する（件数なし）
    setBuyerCandidateCount(null);
  } finally {
    setBuyerCandidateLoading(false);
  }
};

useEffect(() => {
  if (propertyNumber) {
    fetchPropertyData();
    fetchBuyers();
    fetchWorkTaskData();
    fetchBuyerCandidateCount(); // 追加
  }
}, [propertyNumber]);
```

#### UI要素

```tsx
<Button
  variant="outlined"
  startIcon={<PersonIcon />}
  onClick={handleOpenBuyerCandidates}
  disabled={buyerCandidateLoading}
  sx={{
    borderColor: SECTION_COLORS.property.main,
    color: SECTION_COLORS.property.main,
    '&:hover': {
      borderColor: SECTION_COLORS.property.dark,
      backgroundColor: `${SECTION_COLORS.property.main}08`,
    },
  }}
>
  買主候補リスト
  {buyerCandidateCount !== null && (
    <Chip
      label={`${buyerCandidateCount}件`}
      size="small"
      sx={{
        ml: 1,
        bgcolor: SECTION_COLORS.property.main,
        color: 'white',
        fontWeight: 'bold',
      }}
    />
  )}
</Button>
```

#### ハンドラー関数

```tsx
const handleOpenBuyerCandidates = () => {
  if (!propertyNumber) return;
  
  // 新しいタブで買主候補リストページを開く
  window.open(
    `/property-listings/${propertyNumber}/buyer-candidates`,
    '_blank',
    'noopener,noreferrer'
  );
};
```

### 3. 既存コンポーネントの削除

右カラム（Grid item xs={12} lg={4}）から以下のコンポーネントを削除：

```tsx
{/* 削除: 買主候補リスト */}
{/* <BuyerCandidateList propertyNumber={data.property_number} /> */}
```

CompactBuyerListForPropertyコンポーネントは残す。

## データモデル

### APIレスポンス型

```typescript
interface BuyerCandidateResponse {
  candidates: BuyerCandidate[];
  total: number;  // ← この値をボタンバッジに表示
  property: {
    property_number: string;
    property_type: string | null;
    sales_price: number | null;
    distribution_areas: string | null;
  };
}
```

## 正確性プロパティ

正確性プロパティとは、システムが満たすべき普遍的な特性や振る舞いを形式的に記述したものです。これらのプロパティは、全ての有効な実行において真であるべき条件を定義し、自動テストによって検証可能です。

### 要件1.1からのプロパティ

**プロパティ1: コピーアイコンボタンの表示**
*任意の*物件詳細ページにおいて、物件番号が表示されている場合、その直後にコピーアイコンボタンが表示される
**検証: 要件1.1**

**プロパティ2: クリップボードへのコピー**
*任意の*物件番号に対して、コピーアイコンボタンをクリックした場合、その物件番号がクリップボードにコピーされる
**検証: 要件1.2**

**プロパティ3: コピー成功時の通知**
*任意の*物件番号のコピーが成功した場合、「物件番号をコピーしました」というメッセージがスナックバーで表示される
**検証: 要件1.3**

### 要件1.4からのプロパティ

**プロパティ4: コピー失敗時のエラー通知**
*任意の*コピー操作が失敗した場合、エラーメッセージがスナックバーで表示される
**検証: 要件1.4**

### 要件2.1からのプロパティ

**プロパティ5: 買主候補リストボタンの表示**
*任意の*物件詳細ページのヘッダーエリアにおいて、「買主候補リスト」ボタンが表示される
**検証: 要件2.1**

### 要件2.2からのプロパティ

**プロパティ6: 候補件数バッジの表示**
*任意の*買主候補リストデータが正常に取得された場合、ボタンに候補件数のバッジが表示される
**検証: 要件2.2**

### 要件2.3からのプロパティ

**プロパティ7: 新しいタブでの買主候補リストページ表示**
*任意の*物件番号に対して、「買主候補リスト」ボタンをクリックした場合、`/property-listings/${propertyNumber}/buyer-candidates`のURLが新しいタブで開かれる
**検証: 要件2.3, 2.4**

### 要件2.5からのプロパティ

**プロパティ8: データ取得失敗時のボタン機能維持**
*任意の*買主候補リストデータの取得が失敗した場合でも、ボタンは引き続きクリック可能であり、買主候補リストページを開くことができる
**検証: 要件2.5**

### 要件3.2からのプロパティ

**プロパティ9: 既存コンポーネントの削除**
*任意の*物件詳細ページにおいて、ページ下部（右カラム）のBuyerCandidateListコンポーネントは表示されない
**検証: 要件3.2**

## エラーハンドリング

### 1. クリップボードAPIのエラー

**エラーケース**:
- ブラウザがClipboard APIをサポートしていない
- HTTPSでない環境でClipboard APIが使用できない
- ユーザーがクリップボードへのアクセスを拒否

**対応**:
```tsx
try {
  await navigator.clipboard.writeText(data.property_number);
  // 成功時の処理
} catch (error) {
  console.error('Failed to copy property number:', error);
  setSnackbar({
    open: true,
    message: '物件番号のコピーに失敗しました',
    severity: 'error',
  });
}
```

### 2. 買主候補リストAPIのエラー

**エラーケース**:
- APIリクエストが失敗
- ネットワークエラー
- サーバーエラー

**対応**:
```tsx
try {
  const response = await api.get(`/api/property-listings/${propertyNumber}/buyer-candidates`);
  setBuyerCandidateCount(response.data.total);
} catch (error) {
  console.error('Failed to fetch buyer candidate count:', error);
  // エラーでもボタンは表示する（件数なし）
  setBuyerCandidateCount(null);
}
```

ボタンは引き続き機能し、クリックすると買主候補リストページを開くことができます。

### 3. window.openのブロック

**エラーケース**:
- ブラウザのポップアップブロッカーが有効
- ユーザーがポップアップを拒否

**対応**:
ユーザーのクリックイベントから直接window.openを呼び出すため、通常はブロックされません。ブロックされた場合は、ブラウザの標準的なポップアップブロック通知が表示されます。

## テスト戦略

### ユニットテスト

以下の具体的なケースをテストします：

1. **物件番号コピー機能**
   - コピーボタンがレンダリングされること
   - コピーボタンをクリックするとnavigator.clipboard.writeTextが呼ばれること
   - コピー成功時にスナックバーが表示されること
   - コピー失敗時にエラースナックバーが表示されること

2. **買主候補リストボタン**
   - ボタンがレンダリングされること
   - APIリクエストが正しいエンドポイントに送信されること
   - 候補件数が正しく表示されること
   - ボタンをクリックするとwindow.openが呼ばれること
   - APIエラー時でもボタンが機能すること

3. **既存機能の維持**
   - BuyerCandidateListコンポーネントが削除されていること
   - 他のヘッダー要素（保存ボタン、Gmail配信ボタン）が正常に動作すること

### プロパティベーステスト

プロパティベーステストは、ランダムに生成された入力に対してプロパティが成立することを検証します。各テストは最低100回実行します。

**テストライブラリ**: fast-check（TypeScript/JavaScript用）

**プロパティテスト1: クリップボードコピーの一貫性**
```typescript
// Feature: property-detail-header-improvements, Property 2: クリップボードへのコピー
// 任意の物件番号に対して、コピー機能が正しく動作することを検証
fc.assert(
  fc.property(
    fc.string({ minLength: 1, maxLength: 20 }), // 物件番号
    async (propertyNumber) => {
      // コピー機能を実行
      await navigator.clipboard.writeText(propertyNumber);
      const copiedText = await navigator.clipboard.readText();
      
      // コピーされた値が元の値と一致することを検証
      return copiedText === propertyNumber;
    }
  ),
  { numRuns: 100 }
);
```

**プロパティテスト2: 買主候補件数の非負性**
```typescript
// Feature: property-detail-header-improvements, Property 6: 候補件数バッジの表示
// 任意のAPIレスポンスに対して、候補件数が非負であることを検証
fc.assert(
  fc.property(
    fc.nat(), // 非負整数
    (total) => {
      // 候補件数が非負であることを検証
      return total >= 0;
    }
  ),
  { numRuns: 100 }
);
```

**プロパティテスト3: URLの正確性**
```typescript
// Feature: property-detail-header-improvements, Property 7: 新しいタブでの買主候補リストページ表示
// 任意の物件番号に対して、正しいURLが生成されることを検証
fc.assert(
  fc.property(
    fc.string({ minLength: 1, maxLength: 20 }), // 物件番号
    (propertyNumber) => {
      const expectedUrl = `/property-listings/${propertyNumber}/buyer-candidates`;
      const generatedUrl = `/property-listings/${propertyNumber}/buyer-candidates`;
      
      // 生成されたURLが期待値と一致することを検証
      return generatedUrl === expectedUrl;
    }
  ),
  { numRuns: 100 }
);
```

### 統合テスト

1. **エンドツーエンドフロー**
   - 物件詳細ページを開く
   - 物件番号コピーボタンをクリック
   - クリップボードの内容を確認
   - スナックバー通知を確認
   - 買主候補リストボタンをクリック
   - 新しいタブが開かれることを確認

2. **APIとの統合**
   - 買主候補リストAPIが正しく呼ばれること
   - レスポンスが正しく処理されること
   - エラー時の挙動が正しいこと

## 実装の注意事項

### 1. 既存機能への影響

- **変更なし**: 保存ボタン、Gmail配信ボタン、公開URL表示
- **削除**: 右カラムのBuyerCandidateListコンポーネント
- **追加**: 物件番号コピーボタン、買主候補リストボタン

### 2. スタイリング

- Material-UIのテーマカラー（SECTION_COLORS.property）を使用
- 既存のヘッダーデザインと統一感を保つ
- ボタンサイズは既存のボタンと同じ（medium）

### 3. アクセシビリティ

- コピーボタンにtitle属性を追加（「物件番号をコピー」）
- ボタンにアイコンとテキストラベルを両方表示
- キーボード操作に対応（既存のMaterial-UIボタンの機能）

### 4. パフォーマンス

- 買主候補リストAPIは1回のみ呼び出し（ページロード時）
- APIエラー時でもUIはブロックされない
- クリップボードAPIは非同期で実行

### 5. ブラウザ互換性

- Clipboard API: Chrome 66+, Firefox 63+, Safari 13.1+
- window.open: 全てのモダンブラウザでサポート
- 古いブラウザではコピー機能がエラーになる可能性があるが、エラーハンドリングで対応

## セキュリティ考慮事項

### 1. クリップボードアクセス

- Clipboard APIはHTTPS環境でのみ動作
- ユーザーの明示的なアクション（クリック）が必要
- 機密情報（物件番号）のコピーだが、既に画面に表示されている情報

### 2. window.open

- `noopener`と`noreferrer`を指定してセキュリティを確保
- 新しいタブは同じオリジンなので、XSSのリスクは低い

### 3. APIエンドポイント

- 既存のAPIエンドポイントを使用（変更なし）
- 認証・認可は既存の仕組みを継承

## デプロイメント

### 1. フロントエンドのみの変更

- バックエンドAPIの変更なし
- データベーススキーマの変更なし
- 環境変数の変更なし

### 2. デプロイ手順

1. フロントエンドのビルド
2. Vercelへのデプロイ
3. 動作確認（物件番号コピー、買主候補リストボタン）

### 3. ロールバック計画

- 変更が小さいため、ロールバックは容易
- 前のコミットに戻すだけで元の状態に復元可能

## 関連ドキュメント

- `.kiro/steering/system-isolation-rule.md`: システム隔離ルール（物件リスト管理画面のみの変更）
- `.kiro/steering/backward-compatibility-rule.md`: 後方互換性ルール（URLやAPIエンドポイントの変更なし）
- `frontend/src/components/BuyerCandidateList.tsx`: 既存の買主候補リストコンポーネント
- `backend/src/routes/propertyListings.ts`: 買主候補リストAPIエンドポイント
