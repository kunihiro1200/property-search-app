# Migration 014: Add valuation_assigned_by Column

## 問題
Supabaseのスキーマキャッシュに`valuation_assigned_by`カラムが認識されていません。

## 解決方法

### 手順1: Supabaseダッシュボードでマイグレーションを実行

1. Supabaseダッシュボードを開く: https://supabase.com/dashboard
2. プロジェクトを選択
3. 左側のメニューから「SQL Editor」を選択
4. 「New query」をクリック
5. 以下のSQLを貼り付けて実行:

```sql
-- Add valuation_assigned_by column to sellers table
ALTER TABLE sellers
ADD COLUMN IF NOT EXISTS valuation_assigned_by TEXT;

-- Add comment for documentation
COMMENT ON COLUMN sellers.valuation_assigned_by IS '査定担当者名';
```

6. 「Run」ボタンをクリックして実行

### 手順2: スキーマキャッシュをリフレッシュ

1. 左側のメニューから「Settings」を選択
2. 「API」タブを選択
3. 「Reload schema cache」ボタンをクリック

### 手順3: 確認

以下のコマンドで確認:

```bash
cd backend
npx ts-node migrations/verify-014-migration.ts
```

成功すると以下のメッセージが表示されます:
```
✅ Column valuation_assigned_by exists and is accessible
```

### 手順4: アプリケーションを再起動

バックエンドサーバーを再起動:
```bash
# Ctrl+C でサーバーを停止
npm run dev
```

## トラブルシューティング

### エラー: "column sellers.valuation_assigned_by does not exist"

- 手順1のSQLが正しく実行されたか確認
- Supabaseダッシュボードの「Table Editor」で`sellers`テーブルを開き、カラムが追加されているか確認

### エラー: "Could not find the 'valuation_assigned_by' column in the schema cache"

- 手順2のスキーマキャッシュのリフレッシュを実行
- バックエンドサーバーを再起動

