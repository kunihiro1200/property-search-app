# Vercelデプロイ分離スクリプト

## 概要

このディレクトリには、Vercelの`Ignored Build Step`機能を使用して、管理画面と公開サイトのデプロイを分離するためのスクリプトが含まれています。

---

## スクリプト一覧

### 1. `should-deploy-admin.sh`
**用途**: 管理画面プロジェクト（`frontend`）用

**動作**:
- 公開サイト専用ファイルのみが変更された場合 → デプロイをスキップ（exit 0）
- それ以外の場合 → デプロイを実行（exit 1）

### 2. `should-deploy-public.sh`
**用途**: 公開サイトプロジェクト（`property-site-frontend`）用

**動作**:
- 管理画面専用ファイルのみが変更された場合 → デプロイをスキップ（exit 0）
- それ以外の場合 → デプロイを実行（exit 1）

---

## Vercel設定手順

### ⚠️ 重要: 本番環境への影響を最小限にするため、段階的に設定してください

### Phase 1: スクリプトのデプロイ（本番環境に影響なし）

1. このスクリプトをGitにコミット・プッシュ
   ```bash
   git add scripts/
   git commit -m "feat: Vercelデプロイ分離スクリプトを追加"
   git push
   ```

2. **この時点では、Vercel設定を変更しないため、本番環境に影響はありません**

---

### Phase 2: 管理画面プロジェクトへの設定適用（公開サイトに影響なし）

**重要**: まず管理画面プロジェクトのみに設定を適用します。公開サイトには影響しません。

1. Vercel Dashboardにログイン
   - URL: https://vercel.com/dashboard

2. `frontend`プロジェクトを選択

3. **Settings** → **Git** に移動

4. **Ignored Build Step** セクションを見つける

5. 以下のコマンドを入力:
   ```bash
   bash scripts/should-deploy-admin.sh
   ```

6. **Save** をクリック

7. **テスト**: 管理画面専用ファイル（例: `SellerListPage.tsx`）を変更してコミット・プッシュ
   - 管理画面プロジェクトがデプロイされることを確認
   - 公開サイトプロジェクトは影響を受けない（まだ設定していないため）

---

### Phase 3: 公開サイトプロジェクトへの設定適用（慎重に）

**重要**: 管理画面プロジェクトの動作確認が完了してから、公開サイトプロジェクトに設定を適用します。

1. Vercel Dashboardにログイン

2. `property-site-frontend`プロジェクトを選択

3. **Settings** → **Git** に移動

4. **Ignored Build Step** セクションを見つける

5. 以下のコマンドを入力:
   ```bash
   bash scripts/should-deploy-public.sh
   ```

6. **Save** をクリック

7. **テスト**: 公開サイト専用ファイル（例: `PublicPropertyListPage.tsx`）を変更してコミット・プッシュ
   - 公開サイトプロジェクトがデプロイされることを確認
   - 管理画面プロジェクトはスキップされることを確認

---

## ロールバック手順

### 問題が発生した場合

もし問題が発生した場合は、すぐにVercel設定を元に戻すことができます。

1. Vercel Dashboard → 該当プロジェクト → **Settings** → **Git**

2. **Ignored Build Step** の入力欄を**空欄**にする

3. **Save** をクリック

4. これで、全ての変更で常にデプロイされる状態に戻ります

---

## ファイル分類

### 管理画面専用ファイル
これらのファイルが変更されたとき、管理画面プロジェクトのみがデプロイされます：

**ページ**:
- `frontend/src/pages/SellerListPage.tsx`
- `frontend/src/pages/SellerDetailPage.tsx`
- `frontend/src/pages/CallModePage.tsx`
- `frontend/src/pages/PropertyListPage.tsx`
- `frontend/src/pages/PropertyDetailPage.tsx`
- `frontend/src/pages/BuyerListPage.tsx`
- `frontend/src/pages/BuyerDetailPage.tsx`
- `frontend/src/pages/BuyerNearbyPropertiesPage.tsx`
- `frontend/src/pages/WorkTaskListPage.tsx`
- `frontend/src/pages/NewBuyerPage.tsx`

**コンポーネント**:
- `frontend/src/components/Seller*.tsx`
- `frontend/src/components/Buyer*.tsx`
- `frontend/src/components/WorkTask*.tsx`
- `frontend/src/components/CallMode*.tsx`
- `frontend/src/components/Property*.tsx`（`PublicProperty*`を除く）

### 公開サイト専用ファイル
これらのファイルが変更されたとき、公開サイトプロジェクトのみがデプロイされます：

**ページ**:
- `frontend/src/pages/PublicPropertyListPage.tsx`
- `frontend/src/pages/PublicPropertyDetailPage.tsx`

**コンポーネント**:
- `frontend/src/components/PublicProperty*.tsx`

### 共通ファイル
これらのファイルが変更されたとき、両方のプロジェクトがデプロイされます：

- `frontend/src/components/`（上記以外の共通コンポーネント）
- `frontend/src/utils/`
- `frontend/src/types/`
- `frontend/src/hooks/`
- `frontend/src/services/`
- `frontend/package.json`
- `frontend/vite.config.ts`
- `backend/`（全てのバックエンドファイル）

---

## テストケース

### テストケース1: 管理画面専用ファイルを変更
```bash
# SellerListPage.tsxを変更
git add frontend/src/pages/SellerListPage.tsx
git commit -m "test: 管理画面専用ファイルを変更"
git push
```

**期待される結果**:
- ✅ 管理画面プロジェクト: デプロイ実行
- ✅ 公開サイトプロジェクト: デプロイスキップ

### テストケース2: 公開サイト専用ファイルを変更
```bash
# PublicPropertyListPage.tsxを変更
git add frontend/src/pages/PublicPropertyListPage.tsx
git commit -m "test: 公開サイト専用ファイルを変更"
git push
```

**期待される結果**:
- ✅ 管理画面プロジェクト: デプロイスキップ
- ✅ 公開サイトプロジェクト: デプロイ実行

### テストケース3: 共通ファイルを変更
```bash
# 共通ファイルを変更
git add frontend/src/utils/api.ts
git commit -m "test: 共通ファイルを変更"
git push
```

**期待される結果**:
- ✅ 管理画面プロジェクト: デプロイ実行
- ✅ 公開サイトプロジェクト: デプロイ実行

---

## トラブルシューティング

### 問題1: スクリプトが実行されない

**症状**: Vercelのビルドログに"bash: scripts/should-deploy-admin.sh: No such file or directory"と表示される

**原因**: スクリプトがGitにコミットされていない

**解決方法**:
```bash
git add scripts/
git commit -m "feat: Vercelデプロイ分離スクリプトを追加"
git push
```

### 問題2: スクリプトの実行権限がない

**症状**: Vercelのビルドログに"Permission denied"と表示される

**原因**: スクリプトに実行権限がない

**解決方法**:
```bash
chmod +x scripts/*.sh
git add scripts/
git commit -m "fix: スクリプトに実行権限を付与"
git push
```

### 問題3: デプロイが常にスキップされる

**症状**: 全ての変更でデプロイがスキップされる

**原因**: スクリプトのロジックが間違っている

**解決方法**:
1. Vercel Dashboard → Deployments → 最新のデプロイ → Build Logs を確認
2. スクリプトの出力メッセージを確認
3. 必要に応じてスクリプトを修正

### 問題4: 公開サイトがエラーになった

**症状**: 公開サイトにアクセスすると404エラーまたは500エラーが表示される

**原因**: 設定ミスまたはスクリプトのバグ

**解決方法（緊急）**:
1. Vercel Dashboard → `property-site-frontend` → **Settings** → **Git**
2. **Ignored Build Step** を**空欄**にする
3. **Save** をクリック
4. 最新のコミットを再デプロイ

---

## 後方互換性の保証

**重要**: この変更では、既存のURLは全て維持されます。

### 公開サイトのURL（変更なし）
```
https://property-site-frontend-kappa.vercel.app/public/properties
https://property-site-frontend-kappa.vercel.app/public/properties/AA5030
https://property-site-frontend-kappa.vercel.app/public/properties?propertyNumber=AA5030
```

### 検証方法
デプロイ後、以下のURLが正常に動作することを確認：

```bash
# 公開サイト - パスパラメータ
curl https://property-site-frontend-kappa.vercel.app/public/properties/AA5030

# 公開サイト - クエリパラメータ
curl "https://property-site-frontend-kappa.vercel.app/public/properties?propertyNumber=AA5030"

# 公開サイト - UUID形式
curl https://property-site-frontend-kappa.vercel.app/public/properties/90de1182-b015-430d-9d53-4ccf9dc2591a
```

---

## 新しいページを追加する場合

### 管理画面専用ページを追加
1. ページを作成（例: `frontend/src/pages/TaskListPage.tsx`）
2. スクリプトの更新は不要（管理画面専用ファイルとして自動的に判定される）

### 公開サイト専用ページを追加
1. ページを作成（例: `frontend/src/pages/PublicPropertyMapPage.tsx`）
2. `scripts/should-deploy-admin.sh`の`PUBLIC_ONLY_PATTERNS`に追加:
   ```bash
   PUBLIC_ONLY_PATTERNS=(
     # ... 既存のパターン
     "frontend/src/pages/PublicPropertyMapPage.tsx"
   )
   ```
3. スクリプトをコミット・プッシュ

---

## まとめ

**安全な設定手順**:
1. ✅ スクリプトをGitにコミット・プッシュ（本番環境に影響なし）
2. ✅ 管理画面プロジェクトに設定を適用（公開サイトに影響なし）
3. ✅ 動作確認
4. ✅ 公開サイトプロジェクトに設定を適用（慎重に）
5. ✅ 動作確認

**ロールバック**:
- Vercel Dashboard → Settings → Git → Ignored Build Stepを空欄にする

**サポート**:
- 問題が発生した場合は、すぐにロールバックしてください
- デプロイログを確認して、原因を特定してください

---

**作成日**: 2026年2月14日  
**最終更新日**: 2026年2月14日
