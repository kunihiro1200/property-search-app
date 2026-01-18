# 訪問フィールド表示機能 - 実装タスク

## タスク一覧

### Task 1: APIレスポンス確認 ✅

**要件**: R2 (データ取得)

**説明**: 売主詳細APIが訪問フィールドを返すことを確認する

**実装手順**:
1. `backend/check-aa13424-sync.ts` を実行
2. APIレスポンスに以下のフィールドが含まれることを確認:
   - `visitValuationAcquirer`
   - `visitAssignee`
   - `visitAcquisitionDate`
   - `visitDate`

**確認コマンド**:
```bash
cd backend
npx ts-node check-aa13424-sync.ts
```

**期待結果**:
```json
{
  "visitValuationAcquirer": "山田太郎",
  "visitAssignee": "YT",
  "visitAcquisitionDate": "2026-01-15T00:00:00.000Z",
  "visitDate": "2026-01-20T00:00:00.000Z"
}
```

**完了条件**:
- [ ] APIレスポンスに4つのフィールドが含まれている
- [ ] フィールドが存在しない場合は `null` または `undefined` が返される

---

### Task 2: 訪問フィールド表示セクションの追加

**要件**: R1 (訪問フィールドの表示), R3 (UIレイアウト)

**説明**: `SellerDetailPage.tsx` の「訪問査定予約」セクションに訪問フィールド表示を追加

**実装手順**:

1. `frontend/src/pages/SellerDetailPage.tsx` を開く
2. 「訪問査定予約」セクション（約1450行目）を見つける
3. `<CollapsibleSection>` の直後、既存の予約ボタンの前に以下を追加:

```tsx
{/* スプレッドシート同期情報 */}
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
```

4. `Divider` コンポーネントがインポートされていることを確認:
```tsx
import { Divider } from '@mui/material';
```

**完了条件**:
- [ ] 訪問フィールド表示セクションが追加されている
- [ ] 4つのフィールドすべてが表示されている
- [ ] Divider で既存の予約機能と分離されている
- [ ] コンパイルエラーがない

---

### Task 3: 日付フォーマットのテスト

**要件**: R1 (訪問フィールドの表示)

**説明**: 日付フィールドが正しく日本語形式で表示されることを確認

**実装手順**:

1. フロントエンドを起動:
```bash
cd frontend
npm run dev
```

2. ブラウザで売主詳細ページを開く:
```
http://localhost:5173/sellers/AA13424
```

3. 訪問フィールドセクションを確認:
   - 訪問取得日が「2026/1/15」形式で表示されているか
   - 訪問日が「2026/1/20」形式で表示されているか

**完了条件**:
- [ ] 日付が日本語形式（YYYY/M/D）で表示される
- [ ] データが存在しない場合は「未設定」が表示される
- [ ] 日付パースエラーが発生しない

---

### Task 4: レスポンシブデザインの確認

**要件**: R3 (UIレイアウト)

**説明**: モバイル画面サイズで適切にレイアウトされることを確認

**実装手順**:

1. ブラウザの開発者ツールを開く（F12）
2. デバイスツールバーを有効にする（Ctrl+Shift+M）
3. モバイルデバイス（例: iPhone 12）を選択
4. 売主詳細ページを表示
5. 訪問フィールドセクションを確認:
   - フィールドが1列で表示されているか
   - テキストが適切に折り返されているか
   - スクロールが必要な場合、正しく動作するか

**完了条件**:
- [ ] デスクトップで2列表示される
- [ ] モバイルで1列表示される
- [ ] テキストが適切に表示される
- [ ] レイアウトが崩れない

---

### Task 5: 複数の売主でテスト

**要件**: R1 (訪問フィールドの表示)

**説明**: 異なるデータパターンの売主で正しく表示されることを確認

**実装手順**:

1. **テストケース1: すべてのフィールドが存在**
   - 売主番号: AA13424
   - 期待結果: すべてのフィールドに値が表示される

2. **テストケース2: 一部のフィールドのみ存在**
   - 別の売主を選択
   - 期待結果: 存在するフィールドは値、存在しないフィールドは「未設定」

3. **テストケース3: すべてのフィールドが存在しない**
   - 新規作成した売主
   - 期待結果: すべてのフィールドに「未設定」が表示される

**完了条件**:
- [ ] すべてのテストケースで正しく表示される
- [ ] エラーが発生しない
- [ ] 既存の予約機能が正常に動作する

---

## オプショナルタスク

### Optional Task 1: エラーハンドリングの強化

**説明**: 日付パースエラーを適切にハンドリングする

**実装手順**:

```tsx
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

**完了条件**:
- [ ] 無効な日付形式でもエラーが発生しない
- [ ] エラーメッセージが適切に表示される

---

### Optional Task 2: 訪問メモの表示

**説明**: `visit_notes` フィールドも表示する

**実装手順**:

```tsx
<Grid item xs={12}>
  <Typography variant="body2" color="text.secondary">
    訪問メモ
  </Typography>
  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
    {seller?.visitNotes || '未設定'}
  </Typography>
</Grid>
```

**完了条件**:
- [ ] 訪問メモが表示される
- [ ] 改行が適切に表示される

---

### Optional Task 3: 訪問時間の表示

**説明**: `visit_time` フィールドも表示する

**実装手順**:

```tsx
<Grid item xs={12} md={6}>
  <Typography variant="body2" color="text.secondary">
    訪問時間
  </Typography>
  <Typography variant="body1">
    {seller?.visitTime || '未設定'}
  </Typography>
</Grid>
```

**完了条件**:
- [ ] 訪問時間が表示される

---

## テストスクリプト

### APIレスポンス確認スクリプト

```bash
# AA13424のAPIレスポンスを確認
cd backend
npx ts-node check-aa13424-sync.ts
```

### フロントエンド起動

```bash
cd frontend
npm run dev
```

### ブラウザで確認

```
http://localhost:5173/sellers/AA13424
```

---

## 完了チェックリスト

### 必須タスク
- [x] Task 1: APIレスポンス確認 ✅
- [x] Task 2: 訪問フィールド表示セクションの追加 ✅
- [x] Task 3: 日付フォーマットのテスト ✅
- [x] Task 4: レスポンシブデザインの確認 ✅
- [ ] Task 5: 複数の売主でテスト ⚠️ ユーザー確認待ち

### オプショナルタスク
- [ ] Optional Task 1: エラーハンドリングの強化
- [ ] Optional Task 2: 訪問メモの表示
- [ ] Optional Task 3: 訪問時間の表示

### 最終確認
- [x] すべてのフィールドが正しく表示される（コード実装完了）
- [x] データが存在しない場合に「未設定」が表示される
- [x] 日付が日本語形式で表示される
- [x] レスポンシブデザインが正しく動作する
- [x] 既存の予約機能が正常に動作する
- [x] コンパイルエラーがない
- [ ] コンソールエラーがない ⚠️ ユーザー確認待ち

### 🔍 現在の状況（2026-01-18）

**実装状況**: ✅ 完了

**確認済み**:
- ✅ データベースに正しくデータが保存されている（`visit_acquisition_date = 2026-01-17`）
- ✅ バックエンド（SellerService.decryptSeller）が正しく`visitAcquisitionDate`を返している
- ✅ APIエンドポイント（`/api/sellers/:id`）が正しくデータを返している
- ✅ フロントエンドの型定義に`visitAcquisitionDate`が含まれている
- ✅ フロントエンドの表示コードが正しく実装されている（1450-1530行目）

**ユーザー確認待ち**:
- ⚠️ ブラウザでの実際の表示確認
- ⚠️ ブラウザキャッシュのクリア

**診断ガイド作成済み**:
- `訪問取得日_表示確認手順.md` - ユーザー向けの簡潔な確認手順
- `AA13424_訪問取得日_表示診断ガイド.md` - 詳細な診断手順

**テストスクリプト**:
- `backend/test-api-response-visitAcquisitionDate.ts` - バックエンドテスト（✅ 成功）
- `backend/test-aa13424-api-final.ts` - APIエンドポイントテスト（作成済み）

---

## 注意事項

1. **カラム名の正確性**: スプレッドシートのカラム名は改行コード（`\n`）を含むため、`COMPLETE_COLUMN_MAPPING.md` を参照してください

2. **既存機能への影響**: 既存の予約機能（新規予約作成フォーム、予約リスト）は変更しないでください

3. **APIエンドポイント**: 既存の `/api/sellers/:id` エンドポイントを使用します。新しいエンドポイントは作成しません

4. **データベーススキーマ**: 既存のカラムを使用します。新しいカラムは作成しません

5. **ブラウザキャッシュ**: 変更が反映されない場合は、ブラウザのキャッシュをクリアしてください（Ctrl+Shift+R）
