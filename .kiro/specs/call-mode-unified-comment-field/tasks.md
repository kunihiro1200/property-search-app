# 通話モードページ：コメント欄分離機能 - タスクリスト

## タスク概要

通話モードページの「コミュニケーション履歴」セクションと「通話メモ入力」セクションを**分離**し、それぞれ独立した役割を持たせます。

- **スプレッドシートコメント表示**（読み取り専用）：スプレッドシートの「コメント」カラムを表示
- **通話メモ入力**（編集可能）：新規コメントを入力し、既存のコメントに追記してスプレッドシートに保存

---

## タスク一覧

### 1. フロントエンド実装

#### 1.1 スプレッドシートコメント表示（読み取り専用）を追加

- [ ] 「コミュニケーション履歴」セクションに「スプレッドシートコメント」表示を追加
- [ ] `seller.comments` を読み取り専用で表示
- [ ] 背景色をグレー（`grey.50`）にして、編集不可であることを視覚的に示す
- [ ] コメントがない場合は「コメントはありません」と表示

**ファイル**: `frontend/src/pages/CallModePage.tsx`

**実装内容**:
```typescript
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
```

**ステータス**: ⏳ 未実装

---

#### 1.2 通話メモ入力欄の状態管理を追加

- [ ] `callMemo` 状態を追加（`useState<string>('')`）
- [ ] `savingMemo` 状態を追加（`useState(false)`）

**ファイル**: `frontend/src/pages/CallModePage.tsx`

**実装内容**:
```typescript
// 通話メモ入力欄の状態
const [callMemo, setCallMemo] = useState<string>('');
const [savingMemo, setSavingMemo] = useState(false);
```

**ステータス**: ⏳ 未実装

---

#### 1.3 通話メモの保存処理を実装

- [ ] `handleSaveCallMemo` 関数を実装
- [ ] 既存のコメント（`seller.comments`）と新規コメント（`callMemo`）を結合する処理を実装
- [ ] API `PUT /api/sellers/:id` を呼び出す処理を実装
- [ ] 保存後に `callMemo` をクリアする処理を実装
- [ ] 保存後に `loadAllData()` でページをリロードする処理を実装

**ファイル**: `frontend/src/pages/CallModePage.tsx`

**実装内容**:
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

**ステータス**: ⏳ 未実装

---

#### 1.4 クイックボタンの処理を更新

- [ ] クイックボタンのクリック処理を `callMemo` に変更
- [ ] `unifiedComment` の代わりに `callMemo` を使用するように修正

**ファイル**: `frontend/src/pages/CallModePage.tsx`

**実装内容**:
```typescript
const handleQuickButtonClick = (buttonId: string, text: string) => {
  // クイックボタンの無効化処理
  handleQuickButtonClick(buttonId);
  
  // 通話メモ入力欄にテキストを追加
  setCallMemo(callMemo + (callMemo ? '\n' : '') + text);
};
```

**ステータス**: ⏳ 未実装

---

#### 1.5 通話メモ入力欄のUIを実装

- [ ] 「通話メモ入力」セクションのUIを実装
  - [ ] ヘッダー（📝 通話メモ入力）
  - [ ] クイックボタン（既存のコードを移動）
  - [ ] 通話メモ入力欄（TextField、multiline、rows=10）
  - [ ] 不通フィールド（既存のコードを移動）
  - [ ] 保存ボタン

**ファイル**: `frontend/src/pages/CallModePage.tsx`

**実装内容**:
```typescript
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

**ステータス**: ⏳ 未実装

---

#### 1.6 統一コメント欄関連のコードを削除

- [ ] `unifiedComment` 状態を削除
- [ ] `savingComment` 状態を削除
- [ ] `handleSaveUnifiedComment` 関数を削除
- [ ] `RichTextCommentEditor` コンポーネントのインポートを削除
- [ ] 統一コメント欄のUIを削除

**ファイル**: `frontend/src/pages/CallModePage.tsx`

**ステータス**: ⏳ 未実装

---

### 2. バックエンド実装

#### 2.1 定期同期で`comments`フィールドを同期対象に含める

- [ ] `EnhancedAutoSyncService.ts`の`syncSingleSeller`メソッドで`comments`フィールドを同期対象に含める
- [ ] `EnhancedAutoSyncService.ts`の`updateSingleSeller`メソッドで`comments`フィールドを同期対象に含める

**ファイル**: `backend/src/services/EnhancedAutoSyncService.ts`

**実装内容**:
```typescript
// syncSingleSellerメソッド
const comments = row['コメント'];
if (comments !== undefined) {
  updateData.comments = String(comments);
}

// updateSingleSellerメソッド
const comments = row['コメント'];
if (comments !== undefined) {
  updateData.comments = String(comments);
}
```

**ステータス**: ⏳ 未実装

---

#### 2.2 既存APIの確認

- [x] `PUT /api/sellers/:id` エンドポイントが `comments` フィールドを更新できることを確認
- [x] `SyncQueue` がデータベース → スプレッドシートの即時同期を行うことを確認

**ファイル**: 
- `backend/src/routes/sellers.ts`
- `backend/src/services/SellerService.supabase.ts`
- `backend/src/services/SyncQueue.ts`

**確認内容**:
- `PUT /api/sellers/:id` で `comments` フィールドを更新できるか
- 更新後、`SyncQueue` が自動的にスプレッドシートに同期するか

**ステータス**: ✅ 完了（コミット: `44db432`）

---

### 3. テスト

#### 3.1 ユニットテスト

- [ ] `handleSaveCallMemo` 関数のテストを作成
  - [ ] 新規コメントのみを保存
  - [ ] 既存のコメントがある状態で新規コメントを保存
  - [ ] 空欄のまま保存（エラー）
  - [ ] API通信エラー（エラー）

**ファイル**: `frontend/src/pages/CallModePage.test.tsx`（新規作成）

**ステータス**: ⏳ 未実装（オプション）

---

#### 3.2 統合テスト（手動テスト）

- [ ] ページ読み込み時、スプレッドシートのコメントがスプレッドシートコメント表示に表示されることを確認
- [ ] 通話メモ入力欄で新規コメントを入力して保存すると、スプレッドシートに反映されることを確認
- [ ] 保存後、通話メモ入力欄がクリアされることを確認
- [ ] 保存後、スプレッドシートコメント表示に最新のコメントが表示されることを確認
- [ ] クイックボタンをクリックすると、通話メモ入力欄にテキストが追加されることを確認
- [ ] 活動ログが正しく表示されることを確認
- [ ] **通話メモを保存した直後に定期同期が実行されても、ユーザーが入力したコメントが消えないことを確認**

**手動テスト手順**:
1. 通話モードページを開く
2. スプレッドシートコメント表示にスプレッドシートのコメントが表示されることを確認
3. 通話メモ入力欄に新規コメントを入力
4. 「保存」ボタンをクリック
5. 成功メッセージが表示されることを確認
6. ページがリロードされることを確認
7. スプレッドシートコメント表示に最新のコメント（既存のコメント + 新規コメント）が表示されることを確認
8. 通話メモ入力欄が空欄になっていることを確認
9. スプレッドシートを開いて、コメントが反映されていることを確認
10. クイックボタンをクリックして、通話メモ入力欄にテキストが追加されることを確認
11. **5分待って定期同期が実行されることを確認**
12. **定期同期後、スプレッドシートコメント表示に最新のコメントが表示されることを確認**
13. **通話メモ入力欄が空欄のままであることを確認**

**ステータス**: ⏳ 未実装

---

#### 3.3 E2Eテスト

- [ ] Playwrightを使用したE2Eテストを作成（オプション）

**ファイル**: `frontend/e2e/call-mode-separated-comment.spec.ts`（新規作成）

**ステータス**: ⏳ 未実装（オプション）

---

### 4. ドキュメント

#### 4.1 ユーザーマニュアルの更新

- [ ] 通話モードページのユーザーマニュアルを更新
- [ ] スプレッドシートコメント表示と通話メモ入力の使い方を説明

**ファイル**: `docs/user-manual/call-mode-page.md`（存在する場合）

---

#### 4.2 開発者ドキュメントの更新

- [ ] 分離型設計の実装方法を説明
- [ ] データフローを図解

**ファイル**: `docs/developer/call-mode-separated-comment.md`（新規作成）

---

### 5. デプロイ

#### 5.1 ローカル環境でのテスト

- [ ] ローカル環境で動作確認
- [ ] 診断エラーがないことを確認

**コマンド**:
```bash
npm run dev
```

---

#### 5.2 本番環境へのデプロイ

- [ ] フロントエンドをVercelにデプロイ
- [ ] バックエンドをVercelにデプロイ（変更がある場合）
- [ ] 本番環境で動作確認

**コマンド**:
```bash
git add .
git commit -m "feat: 通話モードページのコメント欄を分離型設計に変更"
git push
```

---

## タスクの優先順位

### 高優先度（必須）

1. 1.1 スプレッドシートコメント表示（読み取り専用）を追加
2. 1.2 通話メモ入力欄の状態管理を追加
3. 1.3 通話メモの保存処理を実装
4. 1.4 クイックボタンの処理を更新
5. 1.5 通話メモ入力欄のUIを実装
6. 1.6 統一コメント欄関連のコードを削除
7. 2.1 定期同期で`comments`フィールドを同期対象に含める
8. 3.2 統合テスト

### 中優先度（推奨）

1. 4.1 ユーザーマニュアルの更新

### 低優先度（オプション）

1. 3.1 ユニットテスト
2. 3.3 E2Eテスト
3. 4.2 開発者ドキュメントの更新

---

## 見積もり時間

| タスク | 見積もり時間 | ステータス |
|--------|------------|-----------|
| 1.1 スプレッドシートコメント表示（読み取り専用）を追加 | 30分 | ⏳ 未実装 |
| 1.2 通話メモ入力欄の状態管理を追加 | 15分 | ⏳ 未実装 |
| 1.3 通話メモの保存処理を実装 | 30分 | ⏳ 未実装 |
| 1.4 クイックボタンの処理を更新 | 15分 | ⏳ 未実装 |
| 1.5 通話メモ入力欄のUIを実装 | 1時間 | ⏳ 未実装 |
| 1.6 統一コメント欄関連のコードを削除 | 30分 | ⏳ 未実装 |
| 2.1 定期同期で`comments`フィールドを同期対象に含める | 30分 | ⏳ 未実装 |
| 2.2 既存APIの確認 | 15分 | ✅ 完了 |
| 3.1 ユニットテスト | 1時間 | ⏳ 未実装（オプション） |
| 3.2 統合テスト | 30分 | ⏳ 未実装 |
| 3.3 E2Eテスト | 1時間 | ⏳ 未実装（オプション） |
| 4.1 ユーザーマニュアルの更新 | 30分 | ⏳ 未実装 |
| 4.2 開発者ドキュメントの更新 | 30分 | ⏳ 未実装 |
| 5.1 ローカル環境でのテスト | 15分 | ⏳ 未実装 |
| 5.2 本番環境へのデプロイ | 15分 | ⏳ 未実装 |

**合計**: 約8時間（オプションを含む）

**必須タスクのみ**: 約4時間

**完了済み**: 約15分

**残り**: 約3時間45分

---

## チェックリスト

実装完了前に、以下を確認してください：

### 基本機能

- [ ] スプレッドシートコメント表示にスプレッドシートのコメントが表示される
- [ ] スプレッドシートコメント表示は読み取り専用である（編集不可）
- [ ] 通話メモ入力欄で新規コメントを入力して保存すると、スプレッドシートに反映される
- [ ] 保存時、既存のコメント（スプレッドシートコメント）に新規コメントが追記される
- [ ] 保存後、通話メモ入力欄がクリアされる
- [ ] 保存後、ページがリロードされ、最新のコメントがスプレッドシートコメント表示に表示される
- [ ] クイックボタンが正しく動作する（通話メモ入力欄にテキストが追加される）
- [ ] 不通フィールドが正しく動作する
- [ ] 活動ログが正しく表示される
- [ ] AI要約が正しく表示される
- [ ] コミュニケーション情報が正しく表示される
- [ ] 診断エラーがない

### 同期の競合回避

- [ ] 通話メモを保存した直後に定期同期が実行されても、ユーザーが入力したコメントが消えない
- [ ] 定期同期（5分ごと）でスプレッドシート → データベースの同期が正しく実行される
- [ ] 即時同期（数秒以内）でデータベース → スプレッドシートの同期が正しく実行される
- [ ] 定期同期で`comments`フィールドが同期対象に含まれる

### デプロイ

- [ ] ローカル環境で動作確認済み
- [ ] 本番環境で動作確認済み

---

**作成日**: 2026年2月2日  
**作成者**: Kiro AI  
**バージョン**: 2.0  
**更新日**: 2026年2月2日（分離型設計に変更）
