---
inclusion: fileMatch
fileMatchPattern: "**/PropertyService.ts"
---

# 概算書PDF生成の待機時間設定ルール

## ⚠️ 重要：3つのファイルを同時に修正する

概算書PDF生成の待機時間設定（`waitForCalculationCompletion`メソッド）を変更する際は、**必ず以下の3つのファイルを同時に修正**してください。

---

## 📁 修正が必要なファイル一覧

| ファイルパス | 用途 |
|------------|------|
| `backend/src/services/PropertyService.ts` | 売主管理システム用（ポート3000） |
| `backend/api/src/services/PropertyService.ts` | 公開物件サイト用（ポート3001） |
| `frontend/src/backend/services/PropertyService.ts` | フロントエンド用 |

---

## 🚨 過去の問題

### 2026年1月30日の問題

**問題**: 公開物件サイトの概算書PDF生成が失敗/遅延

**原因**: コミット `4e1de3b` で `backend/src/services/PropertyService.ts` のみを修正し、他の2つのファイルを修正し忘れた

**結果**: 公開物件サイト用のファイル（`backend/api/src/services/PropertyService.ts`）は古い設定のままだった

**解決**: コミット `cb5f24b` で3つのファイル全てを修正

---

## ✅ 現在の最適な設定

```typescript
const VALIDATION_CELL = 'D11';  // 金額セル
const MAX_ATTEMPTS = 3;         // 最大試行回数
const INITIAL_WAIT = 2000;      // 初回待機時間（ms）
const RETRY_INTERVAL = 1000;    // リトライ間隔（ms）
```

**合計最大待機時間**: 約5秒

---

## 📋 チェックリスト

待機時間設定を変更する前に、以下を確認してください：

- [ ] `backend/src/services/PropertyService.ts` を修正した
- [ ] `backend/api/src/services/PropertyService.ts` を修正した
- [ ] `frontend/src/backend/services/PropertyService.ts` を修正した
- [ ] 3つのファイルの設定が同一であることを確認した

---

**最終更新日**: 2026年1月30日
**作成理由**: コミット `4e1de3b` で1つのファイルのみを修正し、他の2つを修正し忘れた問題を防ぐため
