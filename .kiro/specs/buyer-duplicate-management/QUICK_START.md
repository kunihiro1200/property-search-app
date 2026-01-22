# 買主関連表示機能 - クイックスタート

## 🚀 3ステップで開始

### ステップ1: マイグレーション実行（1分）

1. [Supabaseダッシュボード](https://supabase.com/dashboard) にログイン
2. SQL Editorを開く
3. 以下をコピー＆ペーストして実行:

```sql
-- Add index on phone_number for related buyer search
CREATE INDEX IF NOT EXISTS idx_buyers_phone_number 
ON buyers(phone_number) 
WHERE phone_number IS NOT NULL;

-- Add index on email for related buyer search
CREATE INDEX IF NOT EXISTS idx_buyers_email 
ON buyers(email) 
WHERE email IS NOT NULL;

-- Add comment to explain the purpose
COMMENT ON INDEX idx_buyers_phone_number IS 'Index for efficient related buyer detection by phone number';
COMMENT ON INDEX idx_buyers_email IS 'Index for efficient related buyer detection by email address';
```

### ステップ2: 動作確認（2分）

1. 買主詳細ページを開く
2. 以下が表示されることを確認:
   - ✅ ヘッダーに「関連買主」バッジ（関連買主がいる場合）
   - ✅ ページ下部に「関連買主」セクション
   - ✅ ページ下部に「統合問合せ履歴」

### ステップ3: ユーザーに案内（5分）

ユーザーに以下を案内:
- 📖 [ユーザーガイド](./USER_GUIDE.md) を共有
- ⚠️ 重複が見つかった場合の対応手順を説明
- 💡 複数問合せと重複の違いを説明

## 📋 機能概要

### 何ができる？

- ✅ 同じ電話番号・メールアドレスの買主を自動検出
- ✅ 複数問合せと重複を自動分類
- ✅ 統合問合せ履歴で全体像を把握

### 何ができない？

- ❌ 買主レコードの自動統合
- ❌ 買主レコードの自動削除
- ❌ データの自動変更

## 🎯 使い方（30秒）

1. 買主詳細ページを開く
2. ヘッダーの「関連買主」バッジをクリック
3. 関連買主セクションで関係を確認
4. 重複の場合はスプレッドシートで削除

## 📊 関係タイプ

### 📋 複数問合せ（青）
- 異なる物件への問合せ
- 正常な状態
- 対応不要

### ⚠️ 重複の可能性（黄）
- 同じ物件への問合せ
- 要確認
- スプレッドシートで削除

## 🔧 トラブルシューティング

### 関連買主が表示されない
→ 電話番号・メールアドレスが入力されているか確認

### パフォーマンスが遅い
→ インデックスが作成されているか確認

### 重複を削除したのに表示される
→ 次回の同期（30分後）を待つ

## 📚 詳細ドキュメント

- 📖 [ユーザーガイド](./USER_GUIDE.md) - 詳細な使い方
- 🔧 [実装サマリー](./IMPLEMENTATION_SUMMARY.md) - 技術的な詳細
- ✅ [実装完了](./IMPLEMENTATION_COMPLETE.md) - デプロイ前の確認事項

## 💬 サポート

問題が解決しない場合は、システム管理者に連絡してください。

---

**最終更新日:** 2024-12-29
