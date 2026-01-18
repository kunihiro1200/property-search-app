# 訪問フィールド表示機能 - 設計書

## アーキテクチャ概要

この機能は、既存の売主詳細ページに訪問フィールドの表示を追加するものです。新しいAPIエンドポイントやデータベース変更は不要で、既存のデータを表示するだけです。

## コンポーネント構造

### 修正対象ファイル

```
frontend/src/pages/SellerDetailPage.tsx
```

### 追加するセクション

```tsx
{/* 訪問査定予約 */}
<Grid item xs={12}>
  <CollapsibleSection 
    title="訪問査定予約" 
    count={appointments.length}
    defaultExpanded={false}
  >
    {/* 🆕 訪問フィールド表示セクション */}
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle2" gutterBottom>
        スプレッドシート同期情報
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="body2" color="text.secondary">
            訪問査定取得者
          </Typography>
          <Typography variant="body1">
            {seller?.visitValuationAcquirer || '未設定'}
          </Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="body2" color="text.secondary">
            営担
          </Typography>
          <Typography variant="body1">
            {seller?.visitAssignee || '未設定'}
          </Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="body2" color="text.secondary">
            訪問取得日
          </Typography>
          <Typography variant="body1">
            {seller?.visitAcquisitionDate 
              ? new Date(seller.visitAcquisitionDate).toLocaleDateString('ja-JP')
              : '未設定'}
          </Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="body2" color="text.secondary">
            訪問日
          </Typography>
          <Typography variant="body1">
            {seller?.visitDate 
              ? new Date(seller.visitDate).toLocaleDateString('ja-JP')
              : '未設定'}
          </Typography>
        </Grid>
      </Grid>
    </Box>

    <Divider sx={{ my: 3 }} />

    {/* 既存の予約機能 */}
    <Box sx={{ mb: 2 }}>
      ...
    </Box>
  </CollapsibleSection>
</Grid>
```

## データフロー

```
スプレッドシート（売主リスト）
  ↓ (EnhancedAutoSyncService)
データベース（sellers テーブル）
  ↓ (GET /api/sellers/:id)
フロントエンド（SellerDetailPage）
  ↓
表示
```

### 1. スプレッドシート → データベース

**既存機能**（変更なし）

`EnhancedAutoSyncService.ts` が以下のカラムを同期：

| スプレッドシートカラム | データベースカラム |
|---------------------|------------------|
| 訪問査定取得者 | visit_valuation_acquirer |
| 営担 | visit_assignee |
| 訪問取得日\n年/月/日 | visit_acquisition_date |
| 訪問日 \nY/M/D | visit_date |

### 2. データベース → API

**既存機能**（変更なし）

`GET /api/sellers/:id` レスポンス：

```typescript
{
  id: string;
  sellerNumber: string;
  name: string;
  // ... 他のフィールド
  visitValuationAcquirer?: string;
  visitAssignee?: string;
  visitAcquisitionDate?: string; // ISO 8601形式
  visitDate?: string; // ISO 8601形式
}
```

### 3. API → フロントエンド

**新規実装**

`SellerDetailPage.tsx` で訪問フィールドを表示：

```typescript
// 既存のsellerステートを使用
const [seller, setSeller] = useState<any>(null);

// 訪問フィールドを表示
{seller?.visitValuationAcquirer || '未設定'}
{seller?.visitAssignee || '未設定'}
{seller?.visitAcquisitionDate 
  ? new Date(seller.visitAcquisitionDate).toLocaleDateString('ja-JP')
  : '未設定'}
{seller?.visitDate 
  ? new Date(seller.visitDate).toLocaleDateString('ja-JP')
  : '未設定'}
```

## UIデザイン

### レイアウト構造

```
┌─────────────────────────────────────────┐
│ 訪問査定予約 ▼                           │
├─────────────────────────────────────────┤
│ スプレッドシート同期情報                  │
│                                         │
│ ┌─────────────┬─────────────┐          │
│ │訪問査定取得者│ 営担        │          │
│ │山田太郎      │ YT          │          │
│ └─────────────┴─────────────┘          │
│ ┌─────────────┬─────────────┐          │
│ │訪問取得日    │ 訪問日      │          │
│ │2026/1/15    │ 2026/1/20   │          │
│ └─────────────┴─────────────┘          │
│                                         │
│ ─────────────────────────────────────  │
│                                         │
│ [新規予約] ボタン                        │
│                                         │
│ 予約リスト...                            │
└─────────────────────────────────────────┘
```

### スタイリング

- **セクションタイトル**: `Typography variant="subtitle2"`
- **フィールドラベル**: `Typography variant="body2" color="text.secondary"`
- **フィールド値**: `Typography variant="body1"`
- **グリッド**: `Grid container spacing={2}`
- **区切り線**: `Divider sx={{ my: 3 }}`

### レスポンシブデザイン

- **デスクトップ**: 2列表示（`xs={12} md={6}`）
- **モバイル**: 1列表示（`xs={12}`）

## 正確性の保証

### 1. カラム名の正確性

**問題**: スプレッドシートのカラム名に改行コード（`\n`）が含まれている

**解決策**: `COMPLETE_COLUMN_MAPPING.md` を参照

```typescript
// ❌ 間違い
const visitAcquisitionDate = row['訪問取得日'];
const visitDate = row['訪問日'];

// ✅ 正しい
const visitAcquisitionDate = row['訪問取得日\n年/月/日'];
const visitDate = row['訪問日 \nY/M/D'];
```

### 2. 日付フォーマットの正確性

**問題**: ISO 8601形式の日付を日本語形式で表示する必要がある

**解決策**: `toLocaleDateString('ja-JP')` を使用

```typescript
// ISO 8601: "2026-01-17T00:00:00.000Z"
// 日本語形式: "2026/1/17"
new Date(seller.visitAcquisitionDate).toLocaleDateString('ja-JP')
```

### 3. null/undefined の処理

**問題**: データが存在しない場合の表示

**解決策**: Optional chaining と nullish coalescing を使用

```typescript
{seller?.visitValuationAcquirer || '未設定'}
```

### 4. 既存機能への影響

**問題**: 既存の予約機能を壊さない

**解決策**: 
- 新しいセクションを既存のコードの上部に追加
- `Divider` で視覚的に分離
- 既存のステートやハンドラーは変更しない

### 5. APIレスポンスの確認

**問題**: APIレスポンスに訪問フィールドが含まれているか不明

**解決策**: 実装前に確認スクリプトを実行

```typescript
// backend/check-aa13424-sync.ts を参考に
const response = await fetch(`http://localhost:3000/api/sellers/${sellerId}`);
const data = await response.json();
console.log('Visit fields:', {
  visitValuationAcquirer: data.visitValuationAcquirer,
  visitAssignee: data.visitAssignee,
  visitAcquisitionDate: data.visitAcquisitionDate,
  visitDate: data.visitDate,
});
```

## エラーハンドリング

### 1. データ取得エラー

既存のエラーハンドリングを使用（変更なし）

```typescript
useEffect(() => {
  const fetchSeller = async () => {
    try {
      const response = await fetch(`/api/sellers/${id}`);
      if (!response.ok) throw new Error('Failed to fetch seller');
      const data = await response.json();
      setSeller(data);
    } catch (error) {
      console.error('Error fetching seller:', error);
      // エラー表示
    }
  };
  fetchSeller();
}, [id]);
```

### 2. 日付パースエラー

```typescript
{seller?.visitAcquisitionDate 
  ? (() => {
      try {
        return new Date(seller.visitAcquisitionDate).toLocaleDateString('ja-JP');
      } catch (error) {
        console.error('Date parse error:', error);
        return '日付エラー';
      }
    })()
  : '未設定'}
```

## テスト戦略

### 1. 手動テスト

**テストケース1: データが存在する売主**
- 売主番号: AA13424
- 期待結果: すべてのフィールドに値が表示される

**テストケース2: データが存在しない売主**
- 新規作成した売主
- 期待結果: すべてのフィールドに「未設定」が表示される

**テストケース3: 一部のフィールドのみ存在**
- 訪問査定取得者のみ入力された売主
- 期待結果: 入力されたフィールドは値、その他は「未設定」

**テストケース4: レスポンシブデザイン**
- モバイル画面サイズで表示
- 期待結果: 1列表示になる

### 2. API確認スクリプト

```bash
# AA13424のAPIレスポンスを確認
cd backend
npx ts-node check-aa13424-sync.ts
```

### 3. ブラウザ確認

```bash
# フロントエンド起動
cd frontend
npm run dev

# ブラウザで確認
# http://localhost:5173/sellers/AA13424
```

## 実装チェックリスト

- [ ] `SellerDetailPage.tsx` に訪問フィールド表示セクションを追加
- [ ] 4つのフィールドすべてを表示
- [ ] 日付フィールドを日本語形式でフォーマット
- [ ] null/undefined の場合に「未設定」を表示
- [ ] Divider で既存の予約機能と分離
- [ ] レスポンシブデザイン（2列→1列）
- [ ] APIレスポンスに訪問フィールドが含まれることを確認
- [ ] AA13424で手動テスト
- [ ] 新規売主で手動テスト
- [ ] モバイル表示で手動テスト

## 将来の拡張

### 1. 編集機能

現在は表示のみですが、将来的に編集機能を追加する場合：

```typescript
const [isEditingVisitFields, setIsEditingVisitFields] = useState(false);

// 編集フォーム
{isEditingVisitFields ? (
  <TextField
    value={visitValuationAcquirer}
    onChange={(e) => setVisitValuationAcquirer(e.target.value)}
  />
) : (
  <Typography>{seller?.visitValuationAcquirer || '未設定'}</Typography>
)}
```

### 2. 訪問メモの表示

`visit_notes` フィールドも表示する場合：

```typescript
<Grid item xs={12}>
  <Typography variant="body2" color="text.secondary">
    訪問メモ
  </Typography>
  <Typography variant="body1">
    {seller?.visitNotes || '未設定'}
  </Typography>
</Grid>
```

### 3. 訪問時間の表示

`visit_time` フィールドも表示する場合：

```typescript
<Grid item xs={12} md={6}>
  <Typography variant="body2" color="text.secondary">
    訪問時間
  </Typography>
  <Typography variant="body1">
    {seller?.visitTime || '未設定'}
  </Typography>
</Grid>
```
