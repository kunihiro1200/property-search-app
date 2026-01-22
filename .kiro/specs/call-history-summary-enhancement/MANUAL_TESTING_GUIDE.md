# 手動テストガイド

## 概要

このガイドでは、通話履歴サマリー機能の手動テスト方法を説明します。実際の本番データを使用して、生成されたサマリーの品質を確認します。

## テスト準備

### 1. サーバーの起動

```bash
cd backend
npm run dev
```

### 2. 認証トークンの取得

```bash
# ログインしてトークンを取得
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"your-password"}'
```

レスポンスから `token` を取得してください。

## テストケース

### テストケース1: 既存フォーマット（後方互換性）

**目的**: 既存のメモ配列フォーマットが正しく動作することを確認

```bash
curl -X POST http://localhost:3000/api/summarize/call-memos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "memos": [
      "3/2 12:00 訪問査定の日程調整",
      "2/28 15:30 物件情報のヒアリング",
      "2/25 10:00 初回コンタクト"
    ]
  }'
```

**期待される結果**:
- ステータスコード: 200
- `summary` フィールドが存在
- `【通話回数】3回` が含まれる
- 日付順に並んでいる（新しい順）

### テストケース2: 新フォーマット（構造化データ）

**目的**: 新しい構造化データフォーマットが正しく動作することを確認

```bash
curl -X POST http://localhost:3000/api/summarize/call-memos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "communicationHistory": [
      {
        "id": "log-1",
        "action": "phone_call",
        "createdAt": "2024-03-02T12:00:00Z",
        "metadata": { "notes": "訪問査定の日程調整" }
      },
      {
        "id": "log-2",
        "action": "phone_call",
        "createdAt": "2024-02-28T15:30:00Z",
        "metadata": { "notes": "物件情報のヒアリング" }
      }
    ],
    "spreadsheetComments": [
      "2/25 10:00 初回コンタクト",
      "2/20 14:00 資料送付"
    ]
  }'
```

**期待される結果**:
- ステータスコード: 200
- `summary` と `metadata` フィールドが存在
- `metadata.totalCalls` が正しい（重複除外後）
- `metadata.callsFromHistory` と `metadata.callsFromComments` が分かれている

### テストケース3: 売主IDから自動取得

**目的**: 売主IDから自動的にデータを取得してサマリーを生成

```bash
# まず、売主IDを取得
curl -X GET http://localhost:3000/api/sellers \
  -H "Authorization: Bearer YOUR_TOKEN"

# 取得した売主IDを使用
curl -X GET http://localhost:3000/api/summarize/seller/SELLER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**期待される結果**:
- ステータスコード: 200
- `summary`, `metadata`, `seller` フィールドが存在
- 売主の実際のデータが反映されている

### テストケース4: 実際の本番データ

**目的**: 提供された例と比較して品質を確認

以下の実際のデータを使用してテスト:

```bash
curl -X POST http://localhost:3000/api/summarize/call-memos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d @test-data-1.json
```

**test-data-1.json**:
```json
{
  "spreadsheetComments": [
    "10/1 売るのはもう少し様子を見たいとのこと",
    "9/7 今年中に売りたい　県外にいるので大分に来てから実際にいふうとあってから募集するようにしたいとのこと。土地を売ったとしても、買い主様には来年の4月以降に建物を建ててほしい。理由は相続で親戚の方がそこを売りたくないという思いが強いので、自分が今その近くに住んでいて、引っ越したら家を建てても文句を言われないからとのこと（少しあやしい）",
    "9/5 面積はだいたい　更地にしている。駐車場として月極で貸している。売却のご予定あり。土地への思いがあるので変な使い方はされたくない。当社が売買に強く、問合せが多いと伝えるとかなり興味津々でどんな方か？等くいついてきた。訪問査定はまだ考えるとのこと"
  ]
}
```

**期待される出力例**:
```
【次のアクション】訪問査定の日程調整
【通話回数】1回
【連絡可能時間】★希望連絡時間：9時～12時。K留守電不可
【状況】当社が売買に強く、問合せが多いと伝えるとかなり興味津々でどんな方か？等くいついてきた今年中に売りたい　県外にいるので大分に来てから実際にいふうとあってから募集するようにしたいとのこと。土地を売ったとしても、買い主様には来年の4月以降に建物を建ててほしい。理由は相続で親戚の方がそこを売りたくないという思いが強いので、自分が今その近くに住んでいて、引っ越したら家を建てても文句を言われないからとのこと（少しあやしい）駐車場として月極で貸している。
【売却理由】相続
【物件情報】面積はだいたい　更地にしている
【確度】高めだが、売価時期を延期してきた
```

## 品質チェックリスト

### 1. タイムスタンプ解析
- [ ] `M/D HH:mm` フォーマットが正しく解析される
- [ ] 単一桁の月日が正しく処理される（例: `3/2`）
- [ ] 二桁の月日が正しく処理される（例: `12/25`）
- [ ] 24時間形式の時刻が正しく処理される（例: `17:30`）

### 2. 通話回数カウント
- [ ] コミュニケーション履歴からの通話が正しくカウントされる
- [ ] スプレッドシートコメントのタイムスタンプが通話としてカウントされる
- [ ] 5分以内の重複が除外される
- [ ] 合計通話回数が正確

### 3. 時系列順の並び替え
- [ ] 最新のコメントが最初に表示される
- [ ] タイムスタンプ付きコメントが優先される
- [ ] タイムスタンプがない場合は作成日時が使用される

### 4. 内容の要約
- [ ] 重複した内容が除外される
- [ ] 情報が簡潔にまとめられている（コピペではない）
- [ ] 重要な情報が保持されている
- [ ] 各セクションが適切なカテゴリーに分類される

### 5. セクション順序
- [ ] 【次のアクション】が最初
- [ ] 【通話回数】が2番目
- [ ] その他のセクションが正しい順序で表示される
- [ ] 空のセクションが省略される

### 6. 日本語フォーマット
- [ ] セクションヘッダーが正しく表示される（【】付き）
- [ ] 改行が適切に挿入される
- [ ] 文字化けがない
- [ ] 読みやすいフォーマット

### 7. パフォーマンス
- [ ] 処理時間が2秒以内
- [ ] キャッシュが正しく動作する（2回目のリクエストが高速）
- [ ] 200件以上のエントリーでも正常に動作

### 8. エラーハンドリング
- [ ] 不正なタイムスタンプがスキップされる
- [ ] エラーが発生しても処理が継続される
- [ ] 適切なエラーメッセージが返される

## 調整が必要な場合

### キーワードリストの調整

`backend/src/services/ContentSummarizer.ts` のキーワードリストを編集:

```typescript
private readonly KEYWORDS = {
  [SummaryCategory.SITUATION]: [
    '検討中', '前向き', '考え中', '様子見',
    // 新しいキーワードを追加
    'あなたの新しいキーワード'
  ],
  // ...
};
```

### 要約ロジックの調整

`backend/src/services/ContentSummarizer.ts` の `summarize()` メソッドを編集:

```typescript
summarize(contents: string[], category: SummaryCategory): string {
  // 要約ロジックをカスタマイズ
}
```

### 次のアクション生成の調整

`backend/src/services/SummaryGenerator.ts` の `generateNextAction()` メソッドを編集:

```typescript
private generateNextAction(allTexts: string[], categorized: Map<SummaryCategory, string[]>): string {
  // 次のアクション生成ロジックをカスタマイズ
}
```

## トラブルシューティング

### 問題: タイムスタンプが認識されない

**原因**: 正規表現パターンと一致しない形式

**解決策**: `backend/src/services/TimestampParser.ts` の正規表現を確認:
```typescript
private readonly TIMESTAMP_PATTERN = /(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{1,2})/g;
```

### 問題: 通話回数が正しくない

**原因**: 重複除外の閾値が適切でない

**解決策**: `backend/src/services/CallCounter.ts` の閾値を調整:
```typescript
private readonly DEDUPLICATION_THRESHOLD_MS = 5 * 60 * 1000; // 5分
```

### 問題: カテゴリー分類が不正確

**原因**: キーワードリストが不十分

**解決策**: `backend/src/services/ContentSummarizer.ts` のキーワードを追加

### 問題: 処理が遅い

**原因**: エントリー数が多すぎる

**解決策**: `backend/src/services/SummaryGenerator.ts` の最大エントリー数を調整:
```typescript
private readonly MAX_ENTRIES = 200; // 必要に応じて減らす
```

## テスト結果の記録

テスト結果を以下のフォーマットで記録してください:

```markdown
## テスト日時: 2024-03-XX

### テストケース1: 既存フォーマット
- ステータス: ✅ 成功 / ❌ 失敗
- 通話回数: 期待値 X回 / 実際 Y回
- コメント: ...

### テストケース2: 新フォーマット
- ステータス: ✅ 成功 / ❌ 失敗
- メタデータ: 正確 / 不正確
- コメント: ...

### テストケース3: 売主ID取得
- ステータス: ✅ 成功 / ❌ 失敗
- データ取得: 正常 / エラー
- コメント: ...

### テストケース4: 本番データ
- ステータス: ✅ 成功 / ❌ 失敗
- 品質: 高 / 中 / 低
- 改善点: ...

### 総合評価
- 全体的な品質: ...
- 必要な調整: ...
- 次のステップ: ...
```

## まとめ

このガイドに従って手動テストを実施し、結果を記録してください。問題が見つかった場合は、上記のトラブルシューティングセクションを参照して調整してください。

テストが完了したら、Task 16（最終チェックポイント）に進むことができます。
