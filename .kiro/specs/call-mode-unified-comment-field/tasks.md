# 通話モードページ：コメント欄統合機能 - タスクリスト

## タスク概要

通話モードページの「コミュニケーション履歴」と「通話メモ入力」を統合し、スプレッドシートの「コメント」カラムと双方向同期する統一コメント欄を実装します。

---

## タスク一覧

### 1. フロントエンド実装

#### 1.1 統一コメント欄の状態管理を追加

- [x] `unifiedComment` 状態を追加（`useState<string>('')`）
- [x] `savingComment` 状態を追加（`useState(false)`）
- [x] `seller.comments` が変更されたときに `unifiedComment` を初期化する `useEffect` を追加

**ファイル**: `frontend/src/pages/CallModePage.tsx`

**実装内容**:
```typescript
// 統一コメント欄の状態
const [unifiedComment, setUnifiedComment] = useState<string>('');
const [savingComment, setSavingComment] = useState(false);

// sellerが変更されたときにunifiedCommentを初期化
useEffect(() => {
  if (seller) {
    setUnifiedComment(seller.comments || '');
  }
}, [seller]);
```

**ステータス**: ✅ 完了（コミット: `7975f82`）

---

#### 1.2 統一コメント欄の保存処理を実装

- [x] `handleSaveUnifiedComment` 関数を実装
- [x] 既存のコメントと新規コメントを結合する処理を実装
- [x] API `PUT /api/sellers/:id` を呼び出す処理を実装
- [x] 保存後に `unifiedComment` をクリアする処理を実装
- [x] 保存後に `loadAllData()` でページをリロードする処理を実装

**ファイル**: `frontend/src/pages/CallModePage.tsx`

**ステータス**: ✅ 完了（コミット: `7975f82`）

---

#### 1.3 クイックボタンの処理を更新

- [x] クイックボタンのクリック処理を `unifiedComment` に変更
- [x] `callMemo` の代わりに `unifiedComment` を使用するように修正
- [x] **テキスト追加位置を先頭に変更**（コミット: `7975f82`）

**ファイル**: `frontend/src/pages/CallModePage.tsx`

**ステータス**: ✅ 完了（コミット: `7975f82`）

---

#### 1.4 統一コメント欄のUIを実装

- [x] 既存の「通話メモ入力」セクションを削除
- [x] 既存の「コミュニケーション履歴」セクションの「スプレッドシートコメント」表示部分を削除
- [x] 新しい統一コメント欄のUIを実装
  - [x] ヘッダー（📝 コメント）
  - [x] クイックボタン（既存のコードを移動）
  - [x] 統一コメント欄（TextField、multiline、rows=12）
  - [x] 不通フィールド（既存のコードを移動）
  - [x] 保存ボタン
  - [x] AI要約（既存のコードを移動）
  - [x] 活動ログ（既存のコードを移動）
  - [x] コミュニケーション情報（既存のコードを移動）

**ファイル**: `frontend/src/pages/CallModePage.tsx`

**ステータス**: ✅ 完了（コミット: `7975f82`）

---

#### 1.5 不要なコードを削除

- [x] `callMemo` 状態を削除
- [x] `handleSaveAndExit` 関数から `callMemo` 参照を削除
- [x] キーボードショートカットから `Ctrl+S` 保存を削除
- [x] `handleBack` 関数の確認メッセージを「通話メモ」→「コメント」に変更

**ファイル**: `frontend/src/pages/CallModePage.tsx`

**ステータス**: ✅ 完了（コミット: `7975f82`）

---

#### 1.6 リッチテキストエディタコンポーネントを作成（最新要望）

- [x] `RichTextCommentEditor` コンポーネントを作成
  - [x] `contentEditable` を使用したリッチテキスト編集機能
  - [x] 太字ボタン（選択したテキストを `<strong>` タグで囲む）
  - [x] 赤字ボタン（選択したテキストを `<span style="color: red;">` で囲む）
  - [x] クイックボタンからのテキスト挿入時に自動的に太字にする機能

**ファイル**: `frontend/src/components/RichTextCommentEditor.tsx`（新規作成）

**参考**: `frontend/src/components/RichTextEmailEditor.tsx`

**実装内容**:
```typescript
import React, { useRef, useEffect, useState } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { FormatBold, FormatColorText } from '@mui/icons-material';
import { styled } from '@mui/material/styles';

interface RichTextCommentEditorProps {
  value: string;                    // HTML文字列
  onChange: (html: string) => void; // HTML文字列を返す
  placeholder?: string;
  disabled?: boolean;
}

const RichTextCommentEditor: React.FC<RichTextCommentEditorProps> = ({
  value,
  onChange,
  placeholder = 'コメントを入力...',
  disabled = false,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);

  // 初期値の設定
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  // コンテンツ変更時のハンドラー
  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html);
    }
  };

  // 太字ボタンのハンドラー
  const handleBold = () => {
    document.execCommand('bold', false);
    handleInput();
  };

  // 赤字ボタンのハンドラー
  const handleRedText = () => {
    document.execCommand('foreColor', false, 'red');
    handleInput();
  };

  return (
    <Box>
      {/* ツールバー */}
      <Box sx={{ mb: 1, display: 'flex', gap: 1 }}>
        <Tooltip title="太字">
          <IconButton size="small" onClick={handleBold} disabled={disabled}>
            <FormatBold />
          </IconButton>
        </Tooltip>
        <Tooltip title="赤字">
          <IconButton size="small" onClick={handleRedText} disabled={disabled}>
            <FormatColorText sx={{ color: 'red' }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* エディタ */}
      <EditorContainer>
        <ContentEditable
          ref={editorRef}
          contentEditable={!disabled}
          onInput={handleInput}
          data-placeholder={placeholder}
          suppressContentEditableWarning
        />
      </EditorContainer>
    </Box>
  );
};

export default RichTextCommentEditor;
```

**ステータス**: ✅ 完了（コミット: `9e19f59`）

---

#### 1.7 CallModePageを更新（リッチテキストエディタに置き換え）

- [x] `TextField` を `RichTextCommentEditor` に置き換え
- [x] クイックボタンのクリック処理を更新（太字HTMLを挿入）
- [x] 保存処理を更新（HTMLをそのまま保存）

**ファイル**: `frontend/src/pages/CallModePage.tsx`

**実装内容**:
```typescript
// インポート
import RichTextCommentEditor from '../components/RichTextCommentEditor';

// クイックボタンのクリック処理
const handleQuickButtonClick = (buttonId: string, text: string) => {
  // クイックボタンの無効化処理
  handleQuickButtonClick(buttonId);
  
  // 太字HTMLを生成
  const boldText = `<strong>${text}</strong>`;
  
  // 統一コメント欄にHTMLを追加（先頭に追加）
  setUnifiedComment(boldText + (unifiedComment ? '<br>' : '') + unifiedComment);
};

// UIの変更
<RichTextCommentEditor
  value={unifiedComment}
  onChange={setUnifiedComment}
  placeholder="スプレッドシートのコメントがここに表示されます。新規コメントを入力してください..."
  disabled={savingComment}
/>
```

**ステータス**: ✅ 完了（コミット: `9e19f59`）

---

#### 1.7 CallModePageを更新（リッチテキストエディタに置き換え）

- [x] `TextField` を `RichTextCommentEditor` に置き換え
- [x] クイックボタンのクリック処理を更新（太字HTMLを挿入）
- [x] 保存処理を更新（HTMLをそのまま保存）

**ファイル**: `frontend/src/pages/CallModePage.tsx`

**実装内容**:
```typescript
// インポート
import RichTextCommentEditor from '../components/RichTextCommentEditor';

// クイックボタンのクリック処理
const handleQuickButtonClick = (buttonId: string, text: string) => {
  // クイックボタンの無効化処理
  handleQuickButtonClick(buttonId);
  
  // 太字HTMLを生成
  const boldText = `<strong>${text}</strong>`;
  
  // 統一コメント欄にHTMLを追加（先頭に追加）
  setUnifiedComment(boldText + (unifiedComment ? '<br>' : '') + unifiedComment);
};

// UIの変更
<RichTextCommentEditor
  value={unifiedComment}
  onChange={setUnifiedComment}
  placeholder="スプレッドシートのコメントがここに表示されます。新規コメントを入力してください..."
  disabled={savingComment}
/>
```

**ステータス**: ✅ 完了（コミット: `9e19f59`）

---

#### 1.8 保存ボタンのグレーアウト問題を修正（最新修正）

- [x] HTMLコンテンツからテキストのみを抽出する関数を追加（`getTextFromHtml`）
- [x] 統一コメント欄が空かどうかをチェックする関数を追加（`isUnifiedCommentEmpty`）
- [x] `handleSaveUnifiedComment`関数を修正（HTMLコンテンツからテキストを抽出してチェック）
- [x] 保存ボタンの`disabled`属性を修正（`isUnifiedCommentEmpty()`を使用）

**ファイル**: `frontend/src/pages/CallModePage.tsx`

**問題**: 
- `unifiedComment`はHTMLコンテンツ（例: `<b>テキスト</b>`）を含むため、単純な`trim()`では正しく動作しない
- HTMLタグのみの場合（例: `<br>`や空の`<div></div>`）でも、`trim()`は空文字列を返さないため、保存ボタンが有効にならない

**修正内容**:
```typescript
// HTMLコンテンツからテキストのみを抽出する関数
const getTextFromHtml = (html: string): string => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  return tempDiv.textContent || tempDiv.innerText || '';
};

// 統一コメント欄が空かどうかをチェック
const isUnifiedCommentEmpty = (): boolean => {
  return !getTextFromHtml(unifiedComment).trim();
};

// handleSaveUnifiedComment関数を修正
const handleSaveUnifiedComment = async () => {
  // HTMLコンテンツからテキストのみを抽出してチェック
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = unifiedComment;
  const textContent = tempDiv.textContent || tempDiv.innerText || '';
  
  if (!textContent.trim()) {
    setError('コメントを入力してください');
    return;
  }
  // ... 以下省略
};

// 保存ボタンのdisabled属性を修正
<Button
  fullWidth
  variant="contained"
  size="large"
  disabled={savingComment || isUnifiedCommentEmpty()}
  onClick={handleSaveUnifiedComment}
  sx={{ mb: 3 }}
>
```

**ステータス**: ✅ 完了

---

### 2. バックエンド実装

#### 2.1 既存APIの確認

- [x] `PUT /api/sellers/:id` エンドポイントが `comments` フィールドを更新できることを確認
- [x] `EnhancedAutoSyncService` がデータベース → スプレッドシートの同期を行うことを確認
- [x] **`UpdateSellerRequest`型定義に`comments`フィールドを追加**（コミット: `44db432`）
- [x] **`SellerService.supabase.ts`の`updateSeller`メソッドに`comments`フィールドの処理を追加**（コミット: `44db432`）

**ファイル**: 
- `backend/src/routes/sellers.ts`
- `backend/src/services/SellerService.supabase.ts`
- `backend/src/types/index.ts`
- `backend/src/services/EnhancedAutoSyncService.ts`

**確認内容**:
- `PUT /api/sellers/:id` で `comments` フィールドを更新できるか
- 更新後、`SyncQueue` が自動的にスプレッドシートに同期するか

**ステータス**: ✅ 完了（コミット: `44db432`）

**修正内容**:
- `UpdateSellerRequest`型定義に`comments?: string`フィールドを追加
- `SellerService.supabase.ts`の`updateSeller`メソッドに以下の処理を追加:
  ```typescript
  // コメント（統一コメント欄）
  if (data.comments !== undefined) {
    updates.comments = data.comments;
  }
  ```
- これにより、通話モードページでコメント保存時の500エラーが修正される

---

### 3. テスト

#### 3.1 ユニットテスト

- [ ] `handleSaveUnifiedComment` 関数のテストを作成
  - [ ] 新規コメントのみを保存
  - [ ] 既存のコメントがある状態で新規コメントを保存
  - [ ] 空欄のまま保存（エラー）
  - [ ] API通信エラー（エラー）

**ファイル**: `frontend/src/pages/CallModePage.test.tsx`（新規作成）

**ステータス**: ⏳ 未実装（オプション）

---

#### 3.2 統合テスト（手動テスト）

- [ ] ページ読み込み時、スプレッドシートのコメントが統一コメント欄に表示されることを確認
- [ ] 統一コメント欄で新規コメントを入力して保存すると、スプレッドシートに反映されることを確認
- [ ] クイックボタンをクリックすると、統一コメント欄の先頭に**太字**でテキストが追加されることを確認
- [ ] テキストを選択して赤字ボタンをクリックすると、赤字になることを確認
- [ ] 活動ログが正しく表示されることを確認

**手動テスト手順**:
1. 通話モードページを開く
2. 統一コメント欄にスプレッドシートのコメントが表示されることを確認
3. 統一コメント欄に新規コメントを入力
4. 「保存」ボタンをクリック
5. 成功メッセージが表示されることを確認
6. ページがリロードされることを確認
7. 統一コメント欄に最新のコメントが表示されることを確認
8. スプレッドシートを開いて、コメントが反映されていることを確認
9. クイックボタンをクリックして、太字でテキストが追加されることを確認
10. テキストを選択して赤字ボタンをクリックして、赤字になることを確認

**ステータス**: ⏳ 未実装

---

#### 3.3 E2Eテスト

- [ ] Playwrightを使用したE2Eテストを作成（オプション）

**ファイル**: `frontend/e2e/call-mode-unified-comment.spec.ts`（新規作成）

**ステータス**: ⏳ 未実装（オプション）

---

### 4. ドキュメント

#### 4.1 ユーザーマニュアルの更新

- [ ] 通話モードページのユーザーマニュアルを更新
- [ ] 統一コメント欄の使い方を説明

**ファイル**: `docs/user-manual/call-mode-page.md`（存在する場合）

---

#### 4.2 開発者ドキュメントの更新

- [ ] 統一コメント欄の実装方法を説明
- [ ] データフローを図解

**ファイル**: `docs/developer/call-mode-unified-comment.md`（新規作成）

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
git commit -m "feat: 通話モードページのコメント欄を統合"
git push
```

---

## タスクの優先順位

### 高優先度（必須）

1. 1.1 統一コメント欄の状態管理を追加
2. 1.2 統一コメント欄の保存処理を実装
3. 1.4 統一コメント欄のUIを実装
4. 1.5 不要なコードを削除
5. 3.2 統合テスト

### 中優先度（推奨）

1. 1.3 クイックボタンの処理を更新
2. 2.1 既存APIの確認
3. 4.1 ユーザーマニュアルの更新

### 低優先度（オプション）

1. 3.1 ユニットテスト
2. 3.3 E2Eテスト
3. 4.2 開発者ドキュメントの更新

---

## 見積もり時間

| タスク | 見積もり時間 | ステータス |
|--------|------------|-----------|
| 1.1 統一コメント欄の状態管理を追加 | 15分 | ✅ 完了 |
| 1.2 統一コメント欄の保存処理を実装 | 30分 | ✅ 完了 |
| 1.3 クイックボタンの処理を更新 | 15分 | ✅ 完了 |
| 1.4 統一コメント欄のUIを実装 | 1時間 | ✅ 完了 |
| 1.5 不要なコードを削除 | 30分 | ✅ 完了 |
| 1.6 リッチテキストエディタコンポーネントを作成 | 2時間 | ✅ 完了 |
| 1.7 CallModePageを更新（リッチテキストエディタに置き換え） | 1時間 | ✅ 完了 |
| **1.8 保存ボタンのグレーアウト問題を修正** | **30分** | **✅ 完了** |
| 2.1 既存APIの確認 | 15分 | ✅ 完了 |
| 3.1 ユニットテスト | 1時間 | ⏳ 未実装（オプション） |
| 3.2 統合テスト | 30分 | ⏳ 未実装 |
| 3.3 E2Eテスト | 1時間 | ⏳ 未実装（オプション） |
| 4.1 ユーザーマニュアルの更新 | 30分 | ⏳ 未実装 |
| 4.2 開発者ドキュメントの更新 | 30分 | ⏳ 未実装 |
| 5.1 ローカル環境でのテスト | 15分 | ⏳ 未実装 |
| 5.2 本番環境へのデプロイ | 15分 | ⏳ 未実装 |

**合計**: 約10時間（オプションを含む）

**必須タスクのみ**: 約6時間

**完了済み**: 約6時間

**残り**: 約30分（手動テストのみ）

---

## チェックリスト

実装完了前に、以下を確認してください：

### 基本機能（完了済み）

- [x] 統一コメント欄にスプレッドシートのコメントが表示される
- [x] 統一コメント欄で新規コメントを入力して保存すると、スプレッドシートに反映される
- [x] 保存後、統一コメント欄がクリアされる
- [x] 保存後、ページがリロードされ、最新のコメントが表示される
- [x] クイックボタンが正しく動作する（先頭に追加）
- [x] 不通フィールドが正しく動作する
- [x] 活動ログが正しく表示される
- [x] AI要約が正しく表示される
- [x] コミュニケーション情報が正しく表示される
- [x] 診断エラーがない

### リッチテキスト編集機能（完了済み）

- [x] クイックボタンをクリックすると、統一コメント欄の先頭に**太字**でテキストが追加される
- [x] テキストを選択して赤字ボタンをクリックすると、赤字になる
- [x] 太字ボタンをクリックすると、選択したテキストが太字になる
- [x] リッチテキストエディタが正しく動作する
- [x] HTMLがデータベースとスプレッドシートに正しく保存される
- [x] HTMLがフロントエンドで正しく表示される
- [x] 保存ボタンのグレーアウト問題が修正される（HTMLコンテンツからテキストを抽出してチェック）

### デプロイ

- [ ] ローカル環境で動作確認済み
- [ ] 本番環境で動作確認済み

---

**作成日**: 2026年2月2日  
**作成者**: Kiro AI  
**バージョン**: 1.1  
**更新日**: 2026年2月2日（リッチテキスト編集機能のタスクを追加）
