# 物件リスト同期 代替アプローチ - スタートガイド

## 📋 概要

このspecは、物件リストの自動同期における接続問題を解決するための代替アプローチを実装します。直接PostgreSQL接続の問題を回避し、Supabase REST APIを使用した信頼性の高い同期メカニズムを提供します。

## 🎯 目的

- データベース接続エラーを回避する
- Supabase REST APIを使用した安定した同期を実現
- 既存の自動同期機能を維持しながら実装方法を改善

## 📁 ファイル構成

```
.kiro/specs/property-listing-sync-alternative-approach/
├── START_HERE.md              # このファイル - 日本語スタートガイド
├── README.md                  # 英語版概要
├── QUICK_START.md             # クイックスタートガイド
├── IMPLEMENTATION_ROADMAP.md  # 詳細な実装ロードマップ（日本語）
├── requirements.md            # 要件定義
├── design.md                  # 設計ドキュメント
├── tasks.md                   # 実装タスクリスト
├── IMPLEMENTATION_STATUS.md   # 実装状況
└── ROADMAP.md                 # ロードマップ
```

## 🚀 クイックスタート

### 開発者向けクイックリファレンス

| 目的 | コマンド | 所要時間 |
|------|---------|---------|
| 接続診断 | `npx ts-node diagnose-connection-issue.ts` | 1分 |
| 手動同期 | `npx ts-node sync-property-listings-via-rest.ts` | 5-10分 |
| 実装状況確認 | [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) | - |
| 実装開始 | [QUICK_START.md](./QUICK_START.md) | - |

### 1. 現在の状況を確認

```bash
# データベース接続診断を実行
cd backend
npx ts-node diagnose-connection-issue.ts
```

### 2. REST API同期への切り替え

```bash
# REST API経由での同期を実行
npx ts-node sync-property-listings-via-rest.ts
```

### 3. 実装状況の確認

[IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)で現在の進捗を確認できます。

## 📖 ドキュメント

### 📋 実装を始める前に
- **[IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md)** - 12日間の詳細な実装計画（日本語）
- **[QUICK_START.md](./QUICK_START.md)** - 5ステップのクイックスタート

### 📚 技術仕様
- **[requirements.md](./requirements.md)** - 機能要件と受け入れ基準
- **[design.md](./design.md)** - アーキテクチャと実装の詳細
- **[tasks.md](./tasks.md)** - 実装タスクのリストと進捗

### 📊 進捗管理
- **[IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)** - 現在の実装状況

## 🔧 主な変更点

### 従来のアプローチ
- 直接PostgreSQL接続を使用
- 接続エラーが頻発
- `pg`ライブラリに依存

### 新しいアプローチ
- Supabase REST APIを使用
- 安定した接続
- 既存のSupabaseクライアントを活用

### アーキテクチャ比較

```
【従来】
アプリ → pg直接接続 → PostgreSQL
         ❌ 接続エラー頻発

【新方式】
アプリ → Supabase REST API → PostgreSQL
         ✅ 安定した接続
         ✅ 自動リトライ
         ✅ サーキットブレーカー
```

## 📝 実装の流れ

1. **Phase 1: 診断と分析** ✅
   - 接続問題の根本原因を特定
   - REST API代替案の検証

2. **Phase 2: REST API実装** ✅
   - PropertyListingSyncServiceの更新
   - REST API経由の同期ロジック実装

3. **Phase 3: テストと検証** 🔄
   - 同期機能のテスト
   - エラーハンドリングの確認

4. **Phase 4: 本番展開** ⏳
   - 環境変数の設定
   - モニタリングの設定

## 🔍 トラブルシューティング

### 接続エラーが発生する場合

1. 環境変数を確認:
```bash
# backend/.env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

2. Supabaseプロジェクトの状態を確認:
   - プロジェクトが一時停止していないか
   - APIキーが有効か

3. 診断スクリプトを実行:
```bash
npx ts-node diagnose-supabase-rest-api.ts
```

## 📚 関連ドキュメント

- [データベース接続診断完了](../../../DATABASE_CONNECTION_DIAGNOSTIC_COMPLETE.md)
- [コンテキスト転送: データベース接続診断](../../../CONTEXT_TRANSFER_DATABASE_CONNECTION_DIAGNOSIS.md)
- [物件リスト自動同期診断](../../../PROPERTY_LISTING_AUTO_SYNC_DIAGNOSTIC.md)

## 💡 ヒント

### 実装時の注意点

- **環境変数**: 必ず`.env`ファイルでSupabase接続情報を設定してください
- **エラーログ**: `backend/sync-errors.log`でエラーの詳細を確認できます
- **テスト**: 本番環境に適用する前に、必ずテスト環境で検証してください

### よくある落とし穴

1. **環境変数の設定忘れ**
   - ❌ `SUPABASE_URL`や`SUPABASE_SERVICE_ROLE_KEY`が未設定
   - ✅ `.env`ファイルで必ず設定する

2. **バッチサイズが大きすぎる**
   - ❌ 一度に1000件処理してタイムアウト
   - ✅ 100件ずつ処理する（`SYNC_BATCH_SIZE=100`）

3. **レート制限を無視**
   - ❌ API制限を超えてエラー
   - ✅ `SYNC_RATE_LIMIT=10`で制限する

4. **エラーハンドリング不足**
   - ❌ 1件のエラーで全体が停止
   - ✅ 個別にリトライ、失敗はログに記録

5. **テスト不足**
   - ❌ いきなり本番環境で実行
   - ✅ 小規模データでテスト → 段階的に拡大

## 🤝 サポート

問題が発生した場合は、以下を確認してください:

1. [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) - 既知の問題
2. [ROADMAP.md](./ROADMAP.md) - 今後の計画
3. タスクファイルのコメント - 実装の詳細

## 📅 次のステップ

### 実装チェックリスト

#### 準備 (30分)
- [ ] [QUICK_START.md](./QUICK_START.md)を読む
- [ ] [requirements.md](./requirements.md)で要件を確認
- [ ] [design.md](./design.md)で設計を理解
- [ ] 環境変数を設定

#### Phase 1: コアサービス (2-3日)
- [ ] RetryWithBackoff実装
- [ ] CircuitBreaker実装
- [ ] SupabaseClientFactory実装
- [ ] PropertyListingRestSyncService実装
- [ ] ユニットテスト作成

#### Phase 2: キュー処理 (2-3日)
- [ ] PropertyListingSyncProcessor実装
- [ ] RateLimiter強化
- [ ] エラーハンドリング追加
- [ ] 統合テスト作成

#### Phase 3: 状態管理 (2-3日)
- [ ] sync_stateテーブル作成
- [ ] SyncStateService実装
- [ ] API routes実装
- [ ] ダッシュボード作成

#### Phase 4: テスト (2-3日)
- [ ] マイグレーションスクリプト作成
- [ ] 統合テスト実行
- [ ] 負荷テスト実行
- [ ] ドキュメント完成

#### Phase 5: デプロイ (1-2日)
- [ ] 並行実行
- [ ] 段階的切り替え
- [ ] 完全移行
- [ ] モニタリング確認

### 今すぐ始める

1. [QUICK_START.md](./QUICK_START.md)でクイックスタートガイドを確認
2. [tasks.md](./tasks.md)で次に実行するタスクを確認
3. 実装を開始する前に[design.md](./design.md)を確認

---

**最終更新**: 2025-01-09  
**ステータス**: ✅ レビュー完了 - 実装準備完了  
**優先度**: 高  
**レビュー結果**: [SPEC_REVIEW_COMPLETE.md](./SPEC_REVIEW_COMPLETE.md)

🎉 このspecは実装準備が完全に整っています！今すぐ開発を開始できます。
