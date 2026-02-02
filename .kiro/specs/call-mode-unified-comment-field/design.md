# 通話モードページ：コメント欄統合機能 - 設計書

## 1. アーキテクチャ概要

### 1.1 システム構成

```
┌─────────────────────────────────────────────────────────────┐
│                     フロントエンド                           │
│                  (CallModePage.tsx)                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 統一コメント欄コンポーネント                         │  │
│  │ - スプレッドシートコメント表示                       │  │
│  │ - 新規コメント入力                                   │  │
│  │ - クイックボタン                                     │  │
│  │ - 保存ボタン                                         │  │
│  └─────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 活動ログコンポーネント                               │  │
│  │ - 電話、SMS、Emailの履歴表示                         │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↓ API
┌─────────────────────────────────────────────────────────────┐
│                     バックエンド                             │
│                  (SellerService)                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ PUT /api/sellers/:id                                 │  │
│  │ - commentsフィールドを更新                           │  │
│  └─────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ EnhancedAutoSyncService                              │  │
│  │ - データベース → スプレッドシート同期                │  │
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

### 2.1 統一コメント欄コンポーネント

**ファイル**: `frontend/src/pages/CallModePage.tsx`

**状態管理**:
```typescript
// 統一コメント欄の状態
const [unifiedComment, setUnifiedComment] = useState<string>('');

// 保存中フラグ
const [savingComment, setSavingComment] = useState(false);
```

**初期化処理**:
```typescript
useEffect(() => {
  if (seller) {
    // スプレッドシートのコメントを統一コメント欄に表示
    setUnifiedComment(seller.comments || '');
  }
}, [seller]);
```

**保存処理**:
```typescript
const handleSaveUnifiedComment = async () => {
  if (!unifiedComment.trim()) {
    setError('コメントを入力してください');
    return;
  }

  try {
    setSavingComment(true);

    // 既存のコメントと新規コメントを結合
    const existingComments = seller?.comments || '';
    const newComment = unifiedComment.trim();
    
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

    // 統一コメント欄をクリア
    setUnifiedComment('');

    // ページをリロード（最新のコメントを表示）
    await loadAllData();
  } catch (err: any) {
    console.error('コメント保存エラー:', err);
    setError('コメントの保存に失敗しました');
  } finally {
    setSavingComment(false);
  }
};
```

**クイックボタンの処理**:
```typescript
const handleQuickButtonClick = (buttonId: string, text: string) => {
  // クイックボタンの無効化処理
  handleQuickButtonClick(buttonId);
  
  // 統一コメント欄にテキストを追加
  setUnifiedComment(unifiedComment + (unifiedComment ? '\n' : '') + text);
};
```

---

### 2.2 活動ログコンポーネント

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

### 3.1 統一コメント欄のレイアウト

**Material-UI コンポーネント構成**:

```tsx
<Box sx={{ p: 3 }}>
  {/* ヘッダー */}
  <Typography variant="h6" gutterBottom>
    📝 コメント
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

  {/* 統一コメント欄 */}
  <TextField
    fullWidth
    multiline
    rows={12}
    label="コメント"
    placeholder="スプレッドシートのコメントがここに表示されます。新規コメントを入力してください..."
    value={unifiedComment}
    onChange={(e) => setUnifiedComment(e.target.value)}
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
    disabled={savingComment || !unifiedComment.trim()}
    onClick={handleSaveUnifiedComment}
    sx={{ mb: 3 }}
  >
    {savingComment ? <CircularProgress size={24} /> : '保存'}
  </Button>

  {/* AI要約（既存のコードを使用） */}
  {callSummary && (
    <Box sx={{ mb: 3 }}>
      {/* AI要約 */}
    </Box>
  )}

  {/* 活動ログ */}
  <Typography variant="h6" gutterBottom>
    📋 過去の活動ログ
  </Typography>
  <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
    {/* 活動ログ（既存のコードを使用） */}
  </Box>

  {/* コミュニケーション情報（既存のコードを使用） */}
  <Box sx={{ mt: 3 }}>
    {/* コミュニケーション情報 */}
  </Box>
</Box>
```

### 3.2 スタイリング

**統一コメント欄のスタイル**:
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

**活動ログのスタイル**:
```typescript
// 電話
bgcolor: 'grey.50',
borderLeft: 'none',

// SMS
bgcolor: '#e3f2fd',
borderLeft: '4px solid #2196f3',

// Email
bgcolor: '#f3e5f5',
borderLeft: '4px solid #9c27b0',
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
3. useEffect(() => { setUnifiedComment(seller.comments || ''); }, [seller]);
   ↓
4. 統一コメント欄に seller.comments が表示される
   ↓
5. 活動ログに activities が表示される
```

### 4.2 保存時のデータフロー

```
1. ユーザーが統一コメント欄に新規コメントを入力
   ↓
2. ユーザーが「保存」ボタンをクリック
   ↓
3. handleSaveUnifiedComment()
   ├─ 既存のコメント（seller.comments）を取得
   ├─ 新規コメント（unifiedComment）を取得
   ├─ 既存のコメント + '\n' + 新規コメント を結合
   └─ API PUT /api/sellers/:id { comments: updatedComments }
   ↓
4. バックエンド（SellerService）
   ├─ データベースの sellers.comments を更新
   └─ EnhancedAutoSyncService がスプレッドシートに同期
   ↓
5. フロントエンド
   ├─ 成功メッセージを表示
   ├─ 統一コメント欄をクリア（setUnifiedComment('')）
   └─ loadAllData() でページをリロード
   ↓
6. 最新のコメントが統一コメント欄に表示される
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

**スプレッドシート → データベース**: 5分ごとの定期同期（EnhancedPeriodicSyncManager）

### 7.2 同期処理

**サービス**: `EnhancedAutoSyncService`

**処理**:
1. `PUT /api/sellers/:id` でデータベースの `comments` を更新
2. `SyncQueue.enqueue()` で同期をキューに追加
3. `SyncQueue.process()` がキューを処理
4. `SpreadsheetSyncService.syncToSpreadsheet()` がスプレッドシートを更新

---

## 8. エラーハンドリング設計

### 8.1 エラーケース

| エラーケース | 対処方法 |
|------------|---------|
| 統一コメント欄が空欄 | 保存ボタンを無効化 |
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

1. **統一コメント欄の初期化**: `useEffect` で `seller.comments` が変更されたときのみ実行
2. **活動ログの表示**: 最新10件のみ表示（`slice(0, 10)`）
3. **保存処理**: 保存中は保存ボタンを無効化（二重送信防止）

### 9.2 パフォーマンス目標

- 統一コメント欄の読み込み時間: 1秒以内
- 保存処理の完了時間: 3秒以内
- ページリロードの完了時間: 2秒以内

---

## 10. テスト設計

### 10.1 ユニットテスト

**テスト対象**: `handleSaveUnifiedComment` 関数

**テストケース**:
1. 新規コメントのみを保存
2. 既存のコメントがある状態で新規コメントを保存
3. 空欄のまま保存（エラー）
4. API通信エラー（エラー）

### 10.2 統合テスト

**テストケース**:
1. ページ読み込み時、スプレッドシートのコメントが統一コメント欄に表示される
2. 統一コメント欄で新規コメントを入力して保存すると、スプレッドシートに反映される
3. クイックボタンをクリックすると、統一コメント欄にテキストが追加される
4. 活動ログが正しく表示される

### 10.3 E2Eテスト

**テストシナリオ**:
1. 通話モードページを開く
2. 統一コメント欄にスプレッドシートのコメントが表示されることを確認
3. 統一コメント欄に新規コメントを入力
4. 「保存」ボタンをクリック
5. 成功メッセージが表示されることを確認
6. ページがリロードされることを確認
7. 統一コメント欄に最新のコメントが表示されることを確認
8. スプレッドシートを開いて、コメントが反映されていることを確認

---

## 11. セキュリティ設計

### 11.1 認証・認可

- 既存の認証機能を使用（`useAuthStore`）
- APIリクエストには認証トークンを含める

### 11.2 入力検証

- 統一コメント欄の入力値をトリム（`trim()`）
- XSS対策（Material-UIのTextFieldが自動的にエスケープ）

---

## 12. 移行計画

### 12.1 既存機能の削除

**削除対象**:
- 「通話メモ入力」セクションの `callMemo` 状態
- 「通話メモ入力」セクションの `handleSaveAndExit` 関数
- 「コミュニケーション履歴」セクションの「スプレッドシートコメント」表示部分

**保持対象**:
- クイックボタン（統一コメント欄に移動）
- 不通フィールド（統一コメント欄に移動）
- 活動ログ（統一コメント欄の下に移動）
- AI要約（統一コメント欄の下に移動）
- コミュニケーション情報（統一コメント欄の下に移動）

### 12.2 移行手順

1. 新しい統一コメント欄コンポーネントを作成
2. 既存の「通話メモ入力」と「コミュニケーション履歴」を削除
3. 統一コメント欄コンポーネントを配置
4. 動作確認
5. デプロイ

---

## 13. リッチテキスト編集機能（最新要望）

### 13.1 要件

**ユーザーの要望**:
1. **クイックボタンで入力した文字を太字にする**
2. **テキストを選択して赤字にできるようにする**

### 13.2 実装方針

**現状の問題**:
- 現在の`TextField`（プレーンテキスト）では太字や赤字などのリッチテキスト編集ができない

**解決策**:
- `RichTextEmailEditor`コンポーネント（`frontend/src/components/RichTextEmailEditor.tsx`）を参考に、統一コメント欄用のリッチテキストエディタを作成する

### 13.3 新しいコンポーネント設計

**コンポーネント名**: `RichTextCommentEditor`

**ファイル**: `frontend/src/components/RichTextCommentEditor.tsx`

**機能**:
1. **contentEditableを使用したリッチテキスト編集**
2. **太字ボタン**: 選択したテキストを`<strong>`タグで囲む
3. **赤字ボタン**: 選択したテキストを`<span style="color: red;">`で囲む
4. **クイックボタンからのテキスト挿入**: 自動的に太字（`<strong>`）で挿入

**Props**:
```typescript
interface RichTextCommentEditorProps {
  value: string;                    // HTML文字列
  onChange: (html: string) => void; // HTML文字列を返す
  placeholder?: string;
  disabled?: boolean;
}
```

**実装例**:
```typescript
import React, { useRef, useEffect, useState } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { FormatBold, FormatColorText } from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const EditorContainer = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  minHeight: '200px',
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  cursor: 'text',
  '&:focus-within': {
    borderColor: theme.palette.primary.main,
    borderWidth: '2px',
    padding: `calc(${theme.spacing(2)} - 1px)`,
  },
}));

const ContentEditable = styled('div')(({ theme }) => ({
  minHeight: '180px',
  outline: 'none',
  fontFamily: theme.typography.fontFamily,
  fontSize: theme.typography.body1.fontSize,
  lineHeight: 1.6,
  color: theme.palette.text.primary,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  '&:empty:before': {
    content: 'attr(data-placeholder)',
    color: theme.palette.text.disabled,
    pointerEvents: 'none',
  },
}));

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

### 13.4 CallModePageの更新

**変更内容**:
1. `TextField`を`RichTextCommentEditor`に置き換え
2. クイックボタンのクリック処理を更新（太字HTMLを挿入）
3. 保存処理を更新（HTMLをそのまま保存、またはプレーンテキストに変換）

**実装例**:
```typescript
// クイックボタンのクリック処理
const handleQuickButtonClick = (buttonId: string, text: string) => {
  // クイックボタンの無効化処理
  handleQuickButtonClick(buttonId);
  
  // 太字HTMLを生成
  const boldText = `<strong>${text}</strong>`;
  
  // 統一コメント欄にHTMLを追加
  setUnifiedComment(unifiedComment + (unifiedComment ? '<br>' : '') + boldText);
};
```

### 13.5 データ保存形式

**選択肢1: HTML形式で保存**
- **メリット**: リッチテキストの書式が保持される
- **デメリット**: スプレッドシートでHTMLタグが表示される

**選択肢2: プレーンテキストに変換して保存**
- **メリット**: スプレッドシートで読みやすい
- **デメリット**: リッチテキストの書式が失われる

**推奨**: **HTML形式で保存**
- データベースには`TEXT`型で保存（HTMLタグを含む）
- スプレッドシートには`EnhancedAutoSyncService`がHTMLタグを含めて同期
- フロントエンドでは`RichTextCommentEditor`がHTMLを表示

### 13.6 スプレッドシート同期の考慮事項

**現状**:
- `EnhancedAutoSyncService`は`comments`フィールドをそのままスプレッドシートに同期

**HTML形式の場合**:
- スプレッドシートには`<strong>太字</strong>`のようにHTMLタグが表示される
- ユーザーがスプレッドシートで直接編集する場合、HTMLタグを理解する必要がある

**対策**:
- スプレッドシート → データベースの同期時、HTMLタグをそのまま保存
- データベース → スプレッドシートの同期時、HTMLタグをそのまま保存
- フロントエンドでは`RichTextCommentEditor`がHTMLを正しく表示

---

## 14. 今後の拡張

### 14.1 コメント履歴表示

**説明**: 過去のコメントを時系列で表示する機能

**実装案**:
- コメントに日時とユーザー情報を追加
- コメント履歴を別テーブルに保存
- 統一コメント欄の下に履歴を表示

### 14.2 コメント検索機能

**説明**: コメントをキーワードで検索する機能

**実装案**:
- 検索ボックスを追加
- コメント内容を全文検索
- 検索結果をハイライト表示

### 14.3 コメントのタグ付け機能

**説明**: コメントにタグを付けて分類する機能

**実装案**:
- タグ入力フィールドを追加
- タグでフィルタリング
- タグごとに色分け表示

---

**作成日**: 2026年2月2日  
**作成者**: Kiro AI  
**バージョン**: 1.1  
**更新日**: 2026年2月2日（リッチテキスト編集機能を追加）
