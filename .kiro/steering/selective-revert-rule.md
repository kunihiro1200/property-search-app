---
inclusion: manual
---

# 選択的リバートルール（絶対に守るべきルール）

## ⚠️ 重要：リバート時は関係ないファイルを巻き込まない

リバート（コードを以前の状態に戻す）を行う際は、**必ずファイル単位で選択的に復元**してください。
**一括リバートは絶対に禁止**です。

---

## 🚨 過去の問題：2026年1月31日の事例

### 何が起きたか

**コミット `afac2b9`** で「公開物件サイトの画像問題を修正するため」にフロントエンド全体をリバートしました。

**結果**:
- 公開物件サイトの画像問題は修正された
- **しかし、売主リスト関連のファイルまで古い状態に戻された**
- 訪問予定/訪問済みカテゴリが表示されなくなった
- `sellerStatusFilters.ts`から593行が削除された
- `CallModePage.tsx`が大幅に変更された

### 影響を受けたファイル（本来触るべきでなかった）

```
frontend/src/utils/sellerStatusFilters.ts        | 593行削除
frontend/src/utils/sellerStatusUtils.ts          | 136行変更
frontend/src/pages/CallModePage.tsx              | 972行変更
frontend/src/pages/SellersPage.tsx               | 174行変更
frontend/src/hooks/useSellerStatus.ts            | 19行変更
```

---

## ✅ 正しいリバート方法

### ステップ1: 影響範囲を特定

**質問**: どのシステムに問題があるか？

- 売主リスト → `frontend/src/pages/Seller*.tsx`, `frontend/src/utils/seller*.ts`
- 物件リスト → `frontend/src/pages/Property*.tsx`
- 買主リスト → `frontend/src/pages/Buyer*.tsx`
- 業務リスト → `frontend/src/pages/WorkTask*.tsx`
- 公開物件サイト → `frontend/src/pages/PublicProperty*.tsx`

### ステップ2: 復元するファイルを特定

**問題のあるシステムに関連するファイルのみ**をリストアップ。

**例**: 公開物件サイトの画像問題の場合
```
frontend/src/pages/PublicPropertyListPage.tsx
frontend/src/pages/PublicPropertyDetailPage.tsx
frontend/src/components/PublicProperty*.tsx
```

### ステップ3: ファイル単位で復元

```bash
# ✅ 正しい方法：ファイル単位で復元
git checkout <commit> -- frontend/src/pages/PublicPropertyListPage.tsx
git checkout <commit> -- frontend/src/pages/PublicPropertyDetailPage.tsx

# ❌ 間違った方法：ディレクトリ全体を復元
git checkout <commit> -- frontend/src/
```

### ステップ4: 復元後の確認

```bash
# 変更されたファイルを確認
git status

# 意図しないファイルが含まれていないか確認
git diff --stat
```

---

## 🚫 禁止事項

### 1. ディレクトリ全体のリバート

```bash
# ❌ 絶対に禁止
git checkout <commit> -- frontend/
git checkout <commit> -- frontend/src/
git checkout <commit> -- frontend/src/pages/
```

### 2. `git revert`コマンドの無条件使用

```bash
# ❌ 危険（コミット全体を取り消す）
git revert <commit>
```

**理由**: コミットに含まれる全ての変更が取り消される

### 3. 影響範囲を確認せずにリバート

```bash
# ❌ 何が変わるか確認せずに実行
git checkout <commit> -- <path>
```

**必ず先に確認**:
```bash
# ✅ 先に差分を確認
git diff <commit> -- <path>
```

---

## 📋 リバート前のチェックリスト

リバートを実行する前に、以下を確認してください：

- [ ] 問題のあるシステムを特定した
- [ ] 復元するファイルをリストアップした
- [ ] **関係ないシステムのファイルが含まれていないか確認した**
- [ ] 各ファイルの差分を確認した
- [ ] ファイル単位で復元する準備ができた

---

## 🎯 システム別のファイル一覧

### 売主リスト（Seller）

```
frontend/src/pages/SellerListPage.tsx
frontend/src/pages/SellerDetailPage.tsx
frontend/src/pages/CallModePage.tsx
frontend/src/components/Seller*.tsx
frontend/src/components/SellerStatusSidebar.tsx
frontend/src/utils/sellerStatusFilters.ts
frontend/src/utils/sellerStatusUtils.ts
frontend/src/hooks/useSellerStatus.ts
```

### 物件リスト（Property）

```
frontend/src/pages/PropertyListPage.tsx
frontend/src/pages/PropertyDetailPage.tsx
frontend/src/components/Property*.tsx
```

### 買主リスト（Buyer）

```
frontend/src/pages/BuyerListPage.tsx
frontend/src/pages/BuyerDetailPage.tsx
frontend/src/components/Buyer*.tsx
```

### 業務リスト（WorkTask）

```
frontend/src/pages/WorkTaskListPage.tsx
frontend/src/components/WorkTask*.tsx
```

### 公開物件サイト（PublicProperty）

```
frontend/src/pages/PublicPropertyListPage.tsx
frontend/src/pages/PublicPropertyDetailPage.tsx
frontend/src/components/PublicProperty*.tsx
```

---

## 📝 正しいリバートの例

### 例1: 公開物件サイトの画像問題を修正

**問題**: 公開物件サイトで画像が表示されない

**正しい手順**:
```bash
# 1. 動作していたコミットを特定
git log --oneline -- frontend/src/pages/PublicPropertyDetailPage.tsx

# 2. 差分を確認
git diff <commit> -- frontend/src/pages/PublicPropertyDetailPage.tsx

# 3. ファイル単位で復元
git checkout <commit> -- frontend/src/pages/PublicPropertyDetailPage.tsx
git checkout <commit> -- frontend/src/pages/PublicPropertyListPage.tsx

# 4. 変更を確認
git status
git diff --stat

# 5. コミット
git add frontend/src/pages/PublicProperty*.tsx
git commit -m "Fix: Restore PublicProperty pages to working state"
```

### 例2: 売主リストのサイドバー問題を修正

**問題**: サイドバーの訪問予定/訪問済みが表示されない

**正しい手順**:
```bash
# 1. 動作していたコミットを特定
git log --oneline -- frontend/src/components/SellerStatusSidebar.tsx

# 2. 差分を確認
git diff <commit> -- frontend/src/components/SellerStatusSidebar.tsx

# 3. ファイル単位で復元
git checkout <commit> -- frontend/src/components/SellerStatusSidebar.tsx

# 4. 変更を確認
git status

# 5. コミット
git add frontend/src/components/SellerStatusSidebar.tsx
git commit -m "Fix: Restore SellerStatusSidebar to working state"
```

---

## まとめ

**絶対に守るべきルール**:

1. **リバートはファイル単位で行う**
2. **ディレクトリ全体のリバートは禁止**
3. **関係ないシステムのファイルを巻き込まない**
4. **リバート前に必ず差分を確認する**
5. **影響範囲を特定してからリバートする**

**このルールを徹底することで、一つのシステムの修正が他のシステムに影響を与えることを完全に防止できます。**

---

**最終更新日**: 2026年1月31日  
**作成理由**: 公開物件サイトの修正時に売主リストのファイルまで巻き込んでリバートしてしまった問題を防ぐため
