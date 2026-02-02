# 通話モードページ：コメント欄分離機能 - 設計書

## 1. アーキテクチャ概要

### 1.1 システム構成

```
┌─────────────────────────────────────────────────────────────┐
│                     フロントエンド                           │
│                  (CallModePage.tsx)                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ スプレッドシートコメント表示（読み取り専用）         │  │
│  │ - seller.comments を表示                             │  │
│  │ - 編集不可                                           │  │
│  └─────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 活動ログコンポーネント                               │  │
│  │ - 電話、SMS、Emailの履歴表示                         │  │
│  └─────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 通話メモ入力コンポーネント（編集可能）               │  │
│  │ - 新規コメント入力                                   │  │
│  │ - クイックボタン                                     │  │
│  │ - 保存ボタン                                         │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↓ API
┌─────────────────────────────────────────────────────────────┐
│                     バックエンド                             │
│                  (SellerService)                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ PUT /api/sellers/:id                                 │  │
│  │ - commentsフィールドを更新（既存 + 新規）           │  │
│  └─────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ SyncQueue（即時同期）                                │  │
│  │ - データベース → スプレッドシート同期                │  │
│  └─────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ EnhancedAutoSyncService（定期同期）                  │  │
│  │ - スプレッドシート → データベース同期（5分ごと）     │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                  データベース (Supabase)                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ sellers テーブル                                     │  │
│  │ - comments (TEXT)                                    │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              スプレッドシート (Google Sheets)                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 売主リスト                                           │  │
│  │ - コメント カラム                                    │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. コンポーネント設計

### 2.1 スプレッドシートコメント表示（読み取り専用）

**ファイル**: `frontend/src/pages/CallModePage.tsx`

**状態管理**:
```typescript
// seller.comments を直接表示（状態管理不要）
```

**表示処理**:
```typescript
// スプレッドシートコメントを読み取り専用で表示
<Box sx={{ mb: 2 }}>
  <Typography variant="subtitle2" gutterBottom>
    スプレッドシートコメント（読み取り専用）
  </Typography>
  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
    <Typography
      variant="body2"
      sx={{
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        color: 'text.secondary',
      }}
    >
      {seller?.comments || 'コメントはありません'}
    </Typography>
  </Paper>
</Box>
```

---

### 2.2 通話メモ入力（編集可能）

**ファイル**: `frontend/src/pages/CallModePage.tsx`

**状態管理**:
```typescript
// 通話メモ入力欄の状態
const [callMemo, setCallMemo] = useState<string>('');

// 保存中フラグ
const [savingMemo, setSavingMemo] = useState(false);
```

**保存処理**:
```typescript
const handleSaveCallMemo = async () => {
  if (!callMemo.trim()) {
    setError('コメントを入力してください');
    return;
  }

  try {
    setSavingMemo(true);

    // 既存のコメント（スプレッドシートコメント）と新規コメントを結合
    const existingComments = seller?.comments || '';
    const newComment = callMemo.trim();
    
    // 既存のコメントがある場合は改行を挿入
    const updatedComments = existingComments
      ? `${existingComments}\n${newComment}`
      : newComment;

    // APIリクエスト
    await api.put(`/api/sellers/${id}`, {
      comments: updatedComments,
    });

    // 成功メッセージ
    setSuccessMessage('コメントを保存しました');

    // 通話メモ入力欄をクリア
    setCallMemo('');

    // ページをリロード（最新のコメントを表示）
    await loadAllData();
  } catch (err: any) {
    console.error('コメント保存エラー:', err);
    setError('コメントの保存に失敗しました');
  } finally {
    setSavingMemo(false);
  }
};
```

**クイックボタンの処理**:
```typescript
const handleQuickButtonClick = (buttonId: string, text: string) => {
  // クイックボタンの無効化処理
  handleQuickButtonClick(buttonId);
  
  // 通話メモ入力欄にテキストを追加
  setCallMemo(callMemo + (callMemo ? '\n' : '') + text);
};
```

---

### 2.3 活動ログコンポーネント

**ファイル**: `frontend/src/pages/CallModePage.tsx`

**状態管理**:
```typescript
// 活動ログは既存の状態を使用
const [activities, setActivities] = useState<Activity[]>([]);
```

**表示処理**:
```typescript
// 電話、SMS、Emailの活動ログのみを表示
const communicationActivities = activities.filter(
  (activity) => 
    activity.type === 'phone_call' || 
    activity.type === 'sms' || 
    activity.type === 'email'
);

// 最新10件まで表示
const recentActivities = communicationActivities.slice(0, 10);
```

---

## 3. UI設計

### 3.1 レイアウト

**Material-UI コンポーネント構成**:

```tsx
{/* コミュニケーション履歴セクション */}
<Box sx={{ p: 3 }}>
  <Typography variant="h6" gutterBottom>
    📝 コミュニケーション履歴
  </Typography>

  {/* スプレッドシートコメント表示（読み取り専用） */}
  <Box sx={{ mb: 2 }}>
    <Typography variant="subtitle2" gutterBottom>
      スプレッドシートコメント（読み取り専用）
    </Typography>
    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
      <Typography
        variant="body2"
        sx={{
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          color: 'text.secondary',
        }}
      >
        {seller?.comments || 'コメントはありません'}
      </Typography>
    </Paper>
  </Box>

  {/* 活動ログ */}
  <Typography variant="subtitle2" gutterBottom>
    📋 過去の活動ログ
  </Typography>
  <Box sx={{ maxHeight: 300, overflow: 'auto', mb: 3 }}>
    {/* 活動ログ（既存のコードを使用） */}
  </Box>

  {/* AI要約（既存のコードを使用） */}
  {callSummary && (
    <Box sx={{ mb: 3 }}>
      {/* AI要約 */}
    </Box>
  )}

  {/* コミュニケーション情報（既存のコードを使用） */}
  <Box>
    {/* コミュニケーション情報 */}
  </Box>
</Box>

{/* 通話メモ入力セクション */}
<Box sx={{ p: 3 }}>
  <Typography variant="h6" gutterBottom>
    📝 通話メモ入力
  </Typography>

  {/* クイックボタン */}
  <Box sx={{ mb: 2 }}>
    <Typography variant="subtitle2" gutterBottom>
      通話内容に残す言葉
    </Typography>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {/* クイックボタン（既存のコードを使用） */}
    </Box>
  </Box>

  {/* 通話メモ入力欄 */}
  <TextField
    fullWidth
    multiline
    rows={10}
    label="新規コメント"
    placeholder="新規コメントを入力してください..."
    value={callMemo}
    onChange={(e) => setCallMemo(e.target.value)}
    sx={{ mb: 2 }}
  />

  {/* 不通フィールド（既存のコードを使用） */}
  {seller?.inquiryDate && new Date(seller.inquiryDate) >= new Date('2026-01-01') && (
    <Box sx={{ mb: 2 }}>
      {/* 不通ボタン */}
    </Box>
  )}

  {/* 保存ボタン */}
  <Button
    fullWidth
    variant="contained"
    size="large"
    disabled={savingMemo || !callMemo.trim()}
    onClick={handleSaveCallMemo}
  >
    {savingMemo ? <CircularProgress size={24} /> : '保存'}
  </Button>
</Box>
```

### 3.2 スタイリング

**スプレッドシートコメントのスタイル**:
```typescript
sx={{
  p: 2,
  bgcolor: 'grey.50',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
}}
```

**通話メモ入力欄のスタイル**:
```typescript
sx={{
  mb: 2,
  '& .MuiInputBase-root': {
    fontSize: '1rem',
    lineHeight: 1.5,
  },
  '& .MuiInputBase-input': {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
}}
```

---

## 4. データフロー設計

### 4.1 ページ読み込み時のデータフロー

```
1. useEffect(() => { loadAllData(); }, [id]);
   ↓
2. loadAllData()
   ├─ fetchSeller() → seller.comments を取得
   ├─ fetchActivities() → activities を取得
   └─ その他のデータ取得
   ↓
3. スプレッドシートコメント表示に seller.comments が表示される
   ↓
4. 活動ログに activities が表示される
   ↓
5. 通話メモ入力欄は空欄で表示される
```

### 4.2 保存時のデータフロー

```
1. ユーザーが通話メモ入力欄に新規コメントを入力
   ↓
2. ユーザーが「保存」ボタンをクリック
   ↓
3. handleSaveCallMemo()
   ├─ 既存のコメント（seller.comments）を取得
   ├─ 新規コメント（callMemo）を取得
   ├─ 既存のコメント + '\n' + 新規コメント を結合
   └─ API PUT /api/sellers/:id { comments: updatedComments }
   ↓
4. バックエンド（SellerService）
   ├─ データベースの sellers.comments を更新
   └─ SyncQueue がスプレッドシートに即時同期（数秒以内）
   ↓
5. フロントエンド
   ├─ 成功メッセージを表示
   ├─ 通話メモ入力欄をクリア（setCallMemo('')）
   └─ loadAllData() でページをリロード
   ↓
6. 最新のコメントがスプレッドシートコメント表示に表示される
```

### 4.3 定期同期のデータフロー

```
1. EnhancedPeriodicSyncManager が5分ごとに実行
   ↓
2. EnhancedAutoSyncService.runFullSync()
   ├─ Phase 1: 追加同期
   ├─ Phase 2: 更新同期（comments フィールドを含む）
   └─ Phase 3: 削除同期
   ↓
3. スプレッドシート「コメント」列 → データベース comments カラム
   ↓
4. 次回ページ読み込み時、最新のコメントが表示される
```

---

## 5. API設計

### 5.1 既存APIの使用

**エンドポイント**: `PUT /api/sellers/:id`

**リクエストボディ**:
```json
{
  "comments": "既存のコメント\n新規コメント"
}
```

**レスポンス**:
```json
{
  "id": "seller-uuid",
  "sellerNumber": "AA13501",
  "comments": "既存のコメント\n新規コメント",
  ...
}
```

**実装**: `backend/src/routes/sellers.ts` の既存のエンドポイントを使用

---

## 6. データベース設計

### 6.1 既存テーブルの使用

**テーブル**: `sellers`

**カラム**: `comments` (TEXT)

**説明**: 既存のカラムを使用。新しいカラムは追加しない。

---

## 7. スプレッドシート同期設計

### 7.1 同期タイミング

**データベース → スプレッドシート**: 即時同期（SyncQueue）
- トリガー: `SellerService.updateSeller()` 実行時
- タイミング: 数秒以内

**スプレッドシート → データベース**: 定期同期（EnhancedPeriodicSyncManager）
- トリガー: 5分ごとに自動実行
- 同期対象: `comments` フィールドを含む

### 7.2 同期処理

#### 即時同期（データベース → スプレッドシート）

**サービス**: `SyncQueue`

**処理**:
1. `PUT /api/sellers/:id` でデータベースの `comments` を更新
2. `SyncQueue.enqueue()` で同期をキューに追加
3. `SyncQueue.process()` がキューを処理
4. `SpreadsheetSyncService.syncToSpreadsheet()` がスプレッドシートを更新

#### 定期同期（スプレッドシート → データベース）

**サービス**: `EnhancedAutoSyncService`

**処理**:
1. 5分ごとに `EnhancedPeriodicSyncManager` が実行
2. `EnhancedAutoSyncService.runFullSync()` が実行
3. Phase 2: 更新同期で `comments` フィールドを同期
4. スプレッドシート「コメント」列 → データベース `comments` カラム

### 7.3 同期の競合回避

**問題**: 定期同期と即時同期が競合して、ユーザーが入力したコメントが消える

**解決策**:
- **通話メモ入力欄は独立**しており、定期同期の影響を受けない
- 保存時に既存のコメント（スプレッドシートコメント）に新規コメントを追記
- 定期同期は `comments` フィールド全体を同期するが、通話メモ入力欄は空欄なので影響なし

---

## 8. エラーハンドリング設計

### 8.1 エラーケース

| エラーケース | 対処方法 |
|------------|---------|
| 通話メモ入力欄が空欄 | 保存ボタンを無効化 |
| API通信エラー | エラーメッセージを表示 |
| スプレッドシート同期エラー | バックエンドでリトライ（最大3回） |
| ページリロードエラー | エラーメッセージを表示 |

### 8.2 エラーメッセージ

```typescript
// 空欄エラー
setError('コメントを入力してください');

// API通信エラー
setError('コメントの保存に失敗しました');

// ページリロードエラー
setError('データの再読み込みに失敗しました');
```

---

## 9. パフォーマンス設計

### 9.1 最適化ポイント

1. **スプレッドシートコメント表示**: `seller.comments` を直接表示（状態管理不要）
2. **活動ログの表示**: 最新10件のみ表示（`slice(0, 10)`）
3. **保存処理**: 保存中は保存ボタンを無効化（二重送信防止）

### 9.2 パフォーマンス目標

- スプレッドシートコメントの読み込み時間: 1秒以内
- 保存処理の完了時間: 3秒以内
- ページリロードの完了時間: 2秒以内

---

## 10. テスト設計

### 10.1 ユニットテスト

**テスト対象**: `handleSaveCallMemo` 関数

**テストケース**:
1. 新規コメントのみを保存
2. 既存のコメントがある状態で新規コメントを保存
3. 空欄のまま保存（エラー）
4. API通信エラー（エラー）

### 10.2 統合テスト

**テストケース**:
1. ページ読み込み時、スプレッドシートのコメントがスプレッドシートコメント表示に表示される
2. 通話メモ入力欄で新規コメントを入力して保存すると、スプレッドシートに反映される
3. 保存後、通話メモ入力欄がクリアされる
4. 保存後、スプレッドシートコメント表示に最新のコメントが表示される
5. クイックボタンをクリックすると、通話メモ入力欄にテキストが追加される
6. 活動ログが正しく表示される

### 10.3 E2Eテスト

**テストシナリオ**:
1. 通話モードページを開く
2. スプレッドシートコメント表示にスプレッドシートのコメントが表示されることを確認
3. 通話メモ入力欄に新規コメントを入力
4. 「保存」ボタンをクリック
5. 成功メッセージが表示されることを確認
6. ページがリロードされることを確認
7. スプレッドシートコメント表示に最新のコメントが表示されることを確認
8. 通話メモ入力欄が空欄になっていることを確認
9. スプレッドシートを開いて、コメントが反映されていることを確認

---

## 11. セキュリティ設計

### 11.1 認証・認可

- 既存の認証機能を使用（`useAuthStore`）
- APIリクエストには認証トークンを含める

### 11.2 入力検証

- 通話メモ入力欄の入力値をトリム（`trim()`）
- XSS対策（Material-UIのTextFieldが自動的にエスケープ）

---

## 12. 移行計画

### 12.1 既存機能の変更

**変更対象**:
- 「コミュニケーション履歴」セクション：スプレッドシートコメント表示を追加
- 「通話メモ入力」セクション：既存のまま維持

**保持対象**:
- クイックボタン（通話メモ入力セクションに維持）
- 不通フィールド（通話メモ入力セクションに維持）
- 活動ログ（コミュニケーション履歴セクションに維持）
- AI要約（コミュニケーション履歴セクションに維持）
- コミュニケーション情報（コミュニケーション履歴セクションに維持）

### 12.2 移行手順

1. 「コミュニケーション履歴」セクションにスプレッドシートコメント表示を追加
2. 「通話メモ入力」セクションの保存処理を更新（既存のコメントに追記）
3. 動作確認
4. デプロイ

---

## 13. 今後の拡張

### 13.1 コメント履歴表示

**説明**: 過去のコメントを時系列で表示する機能

**実装案**:
- コメントに日時とユーザー情報を追加
- コメント履歴を別テーブルに保存
- スプレッドシートコメント表示の下に履歴を表示

### 13.2 コメント検索機能

**説明**: コメントをキーワードで検索する機能

**実装案**:
- 検索ボックスを追加
- コメント内容を全文検索
- 検索結果をハイライト表示

### 13.3 コメントのタグ付け機能

**説明**: コメントにタグを付けて分類する機能

**実装案**:
- タグ入力フィールドを追加
- タグでフィルタリング
- タグごとに色分け表示

---

**作成日**: 2026年2月2日  
**作成者**: Kiro AI  
**バージョン**: 2.0  
**更新日**: 2026年2月2日（分離型設計に変更）
