# フロントエンドキャッシュクリア手順

## 物件リストが「読み込み中」のまま表示されない問題の解決方法

### ステップ1: ブラウザのキャッシュをクリア

1. **Chrome/Edge の場合**:
   - `Ctrl + Shift + Delete` を押す
   - 「キャッシュされた画像とファイル」にチェック
   - 「データを削除」をクリック

2. **または、ハードリフレッシュ**:
   - `Ctrl + F5` を押す（Windows）
   - `Ctrl + Shift + R` を押す（Windows）

### ステップ2: フロントエンドを再起動

```bash
# フロントエンドを停止（Ctrl + C）
# 再起動
cd frontend
npm run dev
```

### ステップ3: バックエンドを再起動

```bash
# バックエンドを停止（Ctrl + C）
# 再起動
cd backend
npm run dev
```

### ステップ4: ブラウザのコンソールを確認

1. ブラウザで `F12` を押す
2. 「Console」タブを開く
3. エラーメッセージがないか確認
4. 「Network」タブで `/api/property-listings` のリクエストを確認

### ステップ5: それでも解決しない場合

以下のコマンドでAPIエンドポイントを直接テストしてください：

```bash
cd backend
npx ts-node test-property-listing-api.ts
```

## 業務依頼の表示問題

業務依頼は329件存在していますが、フロントエンドで「データが見つかりませんでした」と表示されています。

### 確認事項

1. `work_tasks` テーブルのデータが正しく同期されているか
2. フロントエンドのAPIエンドポイントが正しいか
3. RLS（Row Level Security）ポリシーが正しく設定されているか

### 確認コマンド

```bash
cd backend
npx ts-node check-property-and-work-tasks-status.ts
```
