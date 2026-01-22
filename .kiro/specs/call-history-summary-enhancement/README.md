# 通話履歴サマリー機能 - 完全ガイド

## 📋 概要

通話履歴サマリー機能は、コミュニケーション履歴とスプレッドシートコメントから自動的に構造化されたサマリーを生成する機能です。

**主な機能:**
- タイムスタンプの自動解析（`M/D HH:mm` 形式）
- 通話回数の自動カウント（重複除外）
- 時系列順の並び替え（新しい順）
- 内容の自動要約とカテゴリー分類
- 12のカテゴリーに対応した構造化サマリー

## 🎯 ステータス

**実装状況**: ✅ 完了（82% - 14/17 タスク）

- ✅ コア機能実装（Tasks 1-12）
- ✅ 統合機能（Task 13）
- ✅ パフォーマンス最適化（Task 14）
- ⏳ 手動テスト（Task 15）
- ⏳ 最終チェックポイント（Task 16）
- ✅ ドキュメント（Task 17）

## 📚 ドキュメント一覧

### 🚀 すぐに始める
- **[QUICK_START.md](./QUICK_START.md)** - 5分で始めるクイックスタートガイド
- **[READY_FOR_TESTING.md](./READY_FOR_TESTING.md)** - テスト準備完了報告

### 📖 仕様書
- **[requirements.md](./requirements.md)** - 要件定義（日本語）
- **[design.md](./design.md)** - 設計書（アーキテクチャ、データモデル）
- **[tasks.md](./tasks.md)** - 実装タスクリスト

### 🔧 実装ガイド
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - 実装完了報告
- **[FRONTEND_MIGRATION_GUIDE.md](./FRONTEND_MIGRATION_GUIDE.md)** - フロントエンド移行ガイド

### 🧪 テストガイド
- **[MANUAL_TESTING_GUIDE.md](./MANUAL_TESTING_GUIDE.md)** - 手動テストガイド

## 🎯 推奨される読み方

### 初めての方
1. **[QUICK_START.md](./QUICK_START.md)** - まずはこれを読んで5分でテスト
2. **[READY_FOR_TESTING.md](./READY_FOR_TESTING.md)** - 実装状況を確認
3. **[MANUAL_TESTING_GUIDE.md](./MANUAL_TESTING_GUIDE.md)** - 詳細なテストを実施

### フロントエンド開発者
1. **[FRONTEND_MIGRATION_GUIDE.md](./FRONTEND_MIGRATION_GUIDE.md)** - API統合方法
2. **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - APIの詳細
3. **[QUICK_START.md](./QUICK_START.md)** - 動作確認

### バックエンド開発者
1. **[design.md](./design.md)** - アーキテクチャと設計
2. **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - 実装の詳細
3. **[tasks.md](./tasks.md)** - タスクリスト

### プロジェクトマネージャー
1. **[READY_FOR_TESTING.md](./READY_FOR_TESTING.md)** - 進捗状況
2. **[requirements.md](./requirements.md)** - 要件定義
3. **[tasks.md](./tasks.md)** - タスクリスト

## 🚀 クイックスタート

### 1. サーバー起動
```bash
cd backend
npm run dev
```

### 2. 簡単なテスト
```bash
curl -X POST http://localhost:3000/api/summarize/call-memos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "memos": [
      "3/2 12:00 訪問査定の日程調整",
      "2/28 15:30 物件情報のヒアリング"
    ]
  }'
```

詳細は [QUICK_START.md](./QUICK_START.md) を参照してください。

## 📊 実装されたAPI

### POST `/api/summarize/call-memos`
既存のエンドポイントを拡張（後方互換性維持）

**旧フォーマット:**
```json
{
  "memos": ["メモ1", "メモ2"]
}
```

**新フォーマット:**
```json
{
  "communicationHistory": [...],
  "spreadsheetComments": [...],
  "sellerData": {...}
}
```

### GET `/api/summarize/seller/:sellerId`
売主IDから自動的にデータを取得してサマリーを生成（新規）

```bash
GET /api/summarize/seller/SELLER_ID
```

詳細は [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) を参照してください。

## 🏗️ アーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│                    SummaryGenerator                      │
│                    (統合・キャッシング)                    │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ CallCounter  │   │CommentSorter │   │ContentSumm.. │
│ (通話カウント)│   │(時系列並替)   │   │(要約・分類)   │
└──────────────┘   └──────────────┘   └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            ▼
                  ┌──────────────────┐
                  │ TimestampParser  │
                  │ (タイムスタンプ解析)│
                  └──────────────────┘
```

詳細は [design.md](./design.md) を参照してください。

## 🎨 生成されるサマリーの例

```
【次のアクション】訪問査定の日程調整を行う
【通話回数】3回
【連絡可能時間】月曜日～金曜日 19:00～22:00
【状況】今年中に売りたい、県外在住のため大分に来てから実際に会ってから募集したい
【名義人】母親（認知症ではない）、姉がキーパーソン
【人物像】話が長い、姉が苦手
【売却時期】来年に家を出て行く予定
【売却理由】相続、父親が亡くなり母親が施設に入った
【物件情報】木造平屋、注文住宅、10年前にリフォーム済み
【確度】高め、当社の実績に興味を示している
```

## 📈 パフォーマンス指標

- **処理時間**: < 2秒（目標）
- **キャッシュTTL**: 5分
- **最大エントリー数**: 200件
- **キャッシュサイズ**: 最大100エントリー

## 🔧 技術スタック

- **言語**: TypeScript
- **フレームワーク**: Express.js
- **データベース**: PostgreSQL (Supabase)
- **キャッシング**: メモリ内キャッシュ
- **テスト**: Jest + fast-check

## 📝 実装ファイル

```
backend/src/
├── services/
│   ├── TimestampParser.ts          # タイムスタンプ解析
│   ├── CallCounter.ts              # 通話回数カウント
│   ├── CommentSorter.ts            # コメント並び替え
│   ├── ContentSummarizer.ts        # 内容要約
│   └── SummaryGenerator.ts         # サマリー生成（統合）
├── routes/
│   └── summarize.ts                # APIエンドポイント
└── utils/__tests__/
    ├── testGenerators.ts           # テストデータ生成
    └── testHelpers.ts              # テストヘルパー
```

## 🧪 テスト

### 手動テスト
[MANUAL_TESTING_GUIDE.md](./MANUAL_TESTING_GUIDE.md) を参照してください。

### 自動テスト（オプション）
```bash
cd backend
npm test -- --testPathPattern=Summary
```

## 🐛 トラブルシューティング

### タイムスタンプが認識されない
- フォーマットを確認: `M/D HH:mm` (例: `3/2 12:00`)
- 正規表現パターン: `/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{1,2})/g`

### 通話回数が正しくない
- 重複除外閾値: 5分以内
- `CallCounter.ts` の設定を確認

### カテゴリー分類が不正確
- キーワードリストを調整: `ContentSummarizer.ts`
- 実際のデータに基づいてキーワードを追加

詳細は [MANUAL_TESTING_GUIDE.md](./MANUAL_TESTING_GUIDE.md) のトラブルシューティングセクションを参照してください。

## 📞 サポート

質問や問題がある場合:
1. 該当するドキュメントを確認
2. サーバーログを確認: `backend/logs/`
3. バックエンドチームに連絡

## 🎯 次のステップ

1. **[QUICK_START.md](./QUICK_START.md)** で5分でテスト
2. **[MANUAL_TESTING_GUIDE.md](./MANUAL_TESTING_GUIDE.md)** で詳細なテスト
3. 実際の本番データでテスト
4. フィードバックに基づいて調整
5. 本番環境にデプロイ

## 📄 ライセンス

このプロジェクトは社内プロジェクトです。

## 👥 貢献者

- バックエンドチーム
- フロントエンドチーム
- プロダクトチーム

---

**最終更新**: 2024年3月  
**バージョン**: 1.0.0  
**ステータス**: ✅ 実装完了・テスト準備完了
