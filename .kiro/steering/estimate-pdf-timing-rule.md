---
inclusion: fileMatch
fileMatchPattern: "**/PropertyService.ts"
---

# 概算書PDF生成の待機時間設定ルール（絶対に守るべきルール）

## 🚨 最重要：3つのファイルは必ず同一の設定にする

概算書PDF生成の待機時間設定（`waitForCalculationCompletion`メソッド）は、**3つのファイル全てで同一の設定**でなければなりません。

**絶対に1つのファイルだけを修正してはいけません。**

---

## 📁 同一設定が必要な3つのファイル

| ファイルパス | 用途 | 設定は同一？ |
|------------|------|------------|
| `backend/src/services/PropertyService.ts` | 売主管理システム用（ポート3000） | ✅ 同一 |
| `backend/api/src/services/PropertyService.ts` | 公開物件サイト用（ポート3001） | ✅ 同一 |
| `frontend/src/backend/services/PropertyService.ts` | フロントエンド用 | ✅ 同一 |

**重要**: これら3つのファイルの`waitForCalculationCompletion`メソッドの設定は**完全に同一**でなければなりません。

---

## ✅ 正しい設定（3つのファイル全てで使用）

```typescript
const VALIDATION_CELL = 'D11';  // 金額セル
const MAX_ATTEMPTS = 3;         // 最大試行回数（通常は1回で成功）
const INITIAL_WAIT = 2000;      // 初回待機時間（ms）- 計算は高速なので2秒で十分
const RETRY_INTERVAL = 1000;    // リトライ間隔（ms）- ネットワークエラー対応
```

**合計最大待機時間**: 約5秒（INITIAL_WAIT + MAX_ATTEMPTS × RETRY_INTERVAL = 2 + 3 = 5秒）

---

## ❌ 間違った設定（古い設定 - 使用禁止）

```typescript
// ❌ 絶対に使用しない
const MAX_ATTEMPTS = 20;        // 古い設定
const RETRY_INTERVAL = 500;     // 古い設定
// INITIAL_WAITがない ← 問題
```

**問題点**:
- `INITIAL_WAIT`がないため、計算完了前にセルを読み取ってしまう
- 20回 × 500ms = 10秒もかかる
- 無駄なAPI呼び出しが多い

---

## 🚨 過去の問題

### 2026年1月31日の問題（2回目）

**問題**: 公開物件サイトの概算書PDF生成が再び失敗

**原因**: 前回の修正（`cb5f24b`）後、何らかの理由で`backend/api/src/services/PropertyService.ts`と`frontend/src/backend/services/PropertyService.ts`が古い設定に戻っていた

**解決**: コミット `d9c4f0c` で3つのファイル全てを再度修正

### 2026年1月30日の問題（1回目）

**問題**: 公開物件サイトの概算書PDF生成が失敗/遅延

**原因**: コミット `4e1de3b` で `backend/src/services/PropertyService.ts` のみを修正し、他の2つのファイルを修正し忘れた

**結果**: 公開物件サイト用のファイル（`backend/api/src/services/PropertyService.ts`）は古い設定のままだった

**解決**: コミット `cb5f24b` で3つのファイル全てを修正

---

## 📋 修正時の必須チェックリスト

待機時間設定を変更する前に、**必ず以下を全て確認**してください：

### ステップ1: 3つのファイル全てを修正

- [ ] `backend/src/services/PropertyService.ts` を修正した
- [ ] `backend/api/src/services/PropertyService.ts` を修正した
- [ ] `frontend/src/backend/services/PropertyService.ts` を修正した

### ステップ2: 設定が同一であることを確認

- [ ] 3つのファイルの`VALIDATION_CELL`が同一（`'D11'`）
- [ ] 3つのファイルの`MAX_ATTEMPTS`が同一（`3`）
- [ ] 3つのファイルの`INITIAL_WAIT`が同一（`2000`）
- [ ] 3つのファイルの`RETRY_INTERVAL`が同一（`1000`）

### ステップ3: grepSearchで確認

```bash
# 設定が同一であることを確認
grepSearch "INITIAL_WAIT|MAX_ATTEMPTS|RETRY_INTERVAL" --includePattern="**/PropertyService.ts"
```

---

## 🔍 設定の確認方法

### コマンドで確認

```bash
# 3つのファイルの設定を一度に確認
grepSearch "MAX_ATTEMPTS = |INITIAL_WAIT = |RETRY_INTERVAL = " --includePattern="**/PropertyService.ts"
```

### 期待される出力

```
backend/src/services/PropertyService.ts:
    const MAX_ATTEMPTS = 3;
    const INITIAL_WAIT = 2000;
    const RETRY_INTERVAL = 1000;

backend/api/src/services/PropertyService.ts:
    const MAX_ATTEMPTS = 3;
    const INITIAL_WAIT = 2000;
    const RETRY_INTERVAL = 1000;

frontend/src/backend/services/PropertyService.ts:
    const MAX_ATTEMPTS = 3;
    const INITIAL_WAIT = 2000;
    const RETRY_INTERVAL = 1000;
```

**全て同じ値であることを確認してください。**

---

## 💡 なぜ3つのファイルが存在するのか

| ファイル | 理由 |
|---------|------|
| `backend/src/services/PropertyService.ts` | 売主管理システムのバックエンドで使用 |
| `backend/api/src/services/PropertyService.ts` | 公開物件サイトのVercel Serverless Functionsで使用 |
| `frontend/src/backend/services/PropertyService.ts` | フロントエンドのビルド時に使用（SSR等） |

**重要**: これらは独立したファイルですが、同じ機能を提供するため、**設定は必ず同一**でなければなりません。

---

## 🎯 次回の復元依頼の仕方

概算書PDF生成が失敗した場合：

```
公開物件サイトの概算書PDF生成が失敗。3つのPropertyService.tsファイルの設定を確認して、全て同一の正しい設定（INITIAL_WAIT=2000, MAX_ATTEMPTS=3, RETRY_INTERVAL=1000）に修正して。
```

---

## まとめ

**絶対に守るべきルール**:

1. **3つのファイルは必ず同一の設定にする**
2. **1つのファイルだけを修正してはいけない**
3. **修正後は必ずgrepSearchで確認する**

**正しい設定**:
- `VALIDATION_CELL = 'D11'`
- `MAX_ATTEMPTS = 3`
- `INITIAL_WAIT = 2000`
- `RETRY_INTERVAL = 1000`

**このルールを徹底することで、概算書PDF生成の問題を完全に防止できます。**

---

**最終更新日**: 2026年1月31日
**作成理由**: 3つのファイルの設定が異なっていたことによる概算書PDF生成失敗を防ぐため
**更新履歴**:
- 2026年1月31日: 2回目の問題発生を受けて、ルールを強化
- 2026年1月30日: 初版作成
