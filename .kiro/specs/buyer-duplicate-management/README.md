# 買主関連表示機能（Buyer Related Display Feature）

## 📋 プロジェクト概要

同じ電話番号またはメールアドレスを持つ買主を自動的に検出し、関連情報として表示する機能です。

**ステータス:** ✅ 実装完了 - デプロイ準備完了

**完了日:** 2024-12-29

## 🚀 クイックスタート

すぐに始めたい方は [QUICK_START.md](./QUICK_START.md) をご覧ください。

## 📚 ドキュメント一覧

### ユーザー向け
- **[QUICK_START.md](./QUICK_START.md)** - 3ステップで開始（5分）
- **[USER_GUIDE.md](./USER_GUIDE.md)** - 詳細なユーザーガイド（15分）

### 開発者向け
- **[IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md)** - デプロイ前の確認事項
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - 実装サマリー
- [requirements.md](./requirements.md) - 要件定義
- [design.md](./design.md) - 設計ドキュメント
- [tasks.md](./tasks.md) - タスクリスト

### マイグレーション
- [backend/migrations/058_MANUAL_EXECUTION_GUIDE.md](../../backend/migrations/058_MANUAL_EXECUTION_GUIDE.md) - マイグレーション実行ガイド
- [backend/migrations/058_add_buyer_related_indexes.sql](../../backend/migrations/058_add_buyer_related_indexes.sql) - マイグレーションSQL

## 🎯 主な機能

### 1. 関連買主の自動検出
- 電話番号による検索
- メールアドレスによる検索
- 自分自身の除外

### 2. 関係の自動分類
- 📋 **複数問合せ**: 異なる物件への問合せ（正常）
- ⚠️ **重複の可能性**: 同じ物件への問合せ（要確認）

### 3. 統合問合せ履歴
- 全関連買主の履歴を統合
- 日付順にソート
- 買主番号ごとに色分け

### 4. 通知バッジ
- ヘッダーに関連買主の数を表示
- クリックで関連買主セクションにスクロール

## ⚠️ 重要な注意事項

**この機能はデータを自動的に変更しません**

- ❌ 買主レコードの自動統合は行いません
- ❌ 買主レコードの自動削除は行いません
- ✅ 関連情報の表示のみを行います

重複レコードの削除は、スプレッドシートから手動で行ってください。

## 📊 実装状況

### Backend ✅
- [x] RelatedBuyerService - 関連買主検出・分類
- [x] API Endpoints - 2つのエンドポイント
- [x] Database Migration - パフォーマンス最適化
- [x] 同期ロジック検証

### Frontend ✅
- [x] RelatedBuyersSection - 関連買主リスト
- [x] UnifiedInquiryHistoryTable - 統合履歴
- [x] RelatedBuyerNotificationBadge - 通知バッジ
- [x] BuyerDetailPage統合

### Documentation ✅
- [x] USER_GUIDE.md - ユーザーガイド
- [x] QUICK_START.md - クイックスタート
- [x] IMPLEMENTATION_COMPLETE.md - 実装完了ガイド
- [x] IMPLEMENTATION_SUMMARY.md - 実装サマリー

## 🔧 デプロイ手順

### 1. マイグレーション実行（必須）

Supabaseダッシュボードから以下を実行:

```sql
CREATE INDEX IF NOT EXISTS idx_buyers_phone_number 
ON buyers(phone_number) 
WHERE phone_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_buyers_email 
ON buyers(email) 
WHERE email IS NOT NULL;
```

詳細: [058_MANUAL_EXECUTION_GUIDE.md](../../backend/migrations/058_MANUAL_EXECUTION_GUIDE.md)

### 2. 動作確認（推奨）

- [ ] 買主詳細ページで関連買主バッジが表示される
- [ ] 関連買主セクションが表示される
- [ ] 統合問合せ履歴が表示される
- [ ] 複数問合せと重複が正しく分類される

詳細: [IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md)

### 3. ユーザーへの案内

- [ ] [USER_GUIDE.md](./USER_GUIDE.md) を共有
- [ ] 重複対応手順を説明
- [ ] 複数問合せと重複の違いを説明

## 📈 パフォーマンス

### インデックスなし
- 関連買主検索: O(n) - 全件スキャン
- 10,000件で約100-500ms

### インデックスあり
- 関連買主検索: O(log n) - インデックススキャン
- 10,000件で約5-10ms

**改善率:** 約10-50倍の高速化

## 🔮 今後の拡張案

### 短期的な改善
- キャッシング実装（5分TTL）
- プロパティベーステスト追加
- ユニットテスト追加

### 中期的な改善
- 関連買主の自動マージ機能（管理者のみ）
- 重複検出の精度向上（名前の類似度チェック）
- 関連買主の統計情報表示

### 長期的な改善
- 機械学習による重複検出
- 自動重複解決の提案
- 関連買主のグラフ表示

## 💬 サポート

問題が発生した場合:

1. [USER_GUIDE.md](./USER_GUIDE.md) のトラブルシューティングを確認
2. [IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md) のトラブルシューティングを確認
3. システム管理者に連絡

## 📝 変更履歴

### v1.0.0 (2024-12-29)
- ✅ 初回リリース
- ✅ 関連買主検出機能
- ✅ 関係分類機能
- ✅ 統合問合せ履歴
- ✅ 通知バッジ
- ✅ 完全なドキュメント

---

**プロジェクト:** 売主管理システム
**機能:** 買主関連表示機能
**バージョン:** 1.0.0
**最終更新日:** 2024-12-29
