# Vercelデプロイ分離 - 設計文書

## 1. 設計概要

### 1.1 アーキテクチャ方針
Vercelの`Ignored Build Step`機能を使用して、2つのプロジェクト（管理画面と公開サイト）のデプロイを分離します。

**重要な原則**:
- **既存のURLは全て維持する**（後方互換性ルール）
- **コードの変更は最小限に抑える**
- **既存の機能に影響を与えない**

### 1.2 技術スタック
- **Vercel**: デプロイプラットフォーム
- **Bash/Node.js**: Ignored Build Stepスクリプト
- **Git**: 変更ファイルの検出

---

## 2. システムアーキテクチャ

### 2.1 現在の構成

```
プロジェクトルート
├── frontend/                    # 共有フロントエンドディレクトリ
│   ├── src/
│   │   ├── pages/
│   │   │   ├── SellerListPage.tsx          # 管理画面専用
│   │   │   ├── PropertyListPage.tsx        # 管理画面専用
│   │   │   ├── BuyerListPage.tsx           # 管理画面専用
│   │   │   ├── PublicPropertyListPage.tsx  # 公開サイト専用
│   │   │   └── PublicPropertyDetailPage.tsx # 公開サイト専用
│   │   └── components/
│   │       ├── Seller*.tsx                  # 管理画面専用
│   │       ├── Property*.tsx                # 管理画面専用
│   │       ├── Buyer*.tsx                   # 管理画面専用
│   │       ├── PublicProperty*.tsx          # 公開サイト専用
│   │       └── (共通コンポーネント)
│   └── package.json
├── backend/
│   └── api/
│       └── index.ts
└── vercel.json
```

### 2.2 Vercelプロジェクト構成

#### プロジェクト1: `frontend`（管理画面）
- **プロジェクトID**: （既存）
- **用途**: 物件リスト管理画面（内部管理用）
- **デプロイ条件**: 管理画面専用ファイルまたは共通ファイルが変更されたとき

#### プロジェクト2: `property-site-frontend`（公開サイト）
- **プロジェクトID**: `prj_MgwY5WiGTZezxtwJtO2b9o9Yw9oO`
- **用途**: 公開物件サイト（一般公開用）
- **デプロイ条件**: 公開サイト専用ファイルまたは共通ファイルが変更されたとき

---

## 3. デプロイ分離ロジック

### 3.1 ファイル分類

#### 3.1.1 管理画面専用ファイル（Admin-only）
これらのファイルが変更されたとき、`frontend`プロジェクトのみをデプロイ：

**ページ**:
```
frontend/src/pages/SellerListPage.tsx
frontend/src/pages/SellerDetailPage.tsx
frontend/src/pages/CallModePage.tsx
frontend/src/pages/PropertyListPage.tsx
frontend/src/pages/PropertyDetailPage.tsx
frontend/src/pages/BuyerListPage.tsx
frontend/src/pages/BuyerDetailPage.tsx
frontend/src/pages/BuyerNearbyPropertiesPage.tsx
frontend/src/pages/WorkTaskListPage.tsx
frontend/src/pages/NewBuyerPage.tsx
```

**コンポーネント**:
```
frontend/src/components/Seller*.tsx
frontend/src/components/Property*.tsx（PublicProperty*を除く）
frontend/src/components/Buyer*.tsx
frontend/src/components/WorkTask*.tsx
frontend/src/components/CallMode*.tsx
```

#### 3.1.2 公開サイト専用ファイル（Public-only）
これらのファイルが変更されたとき、`property-site-frontend`プロジェクトのみをデプロイ：

**ページ**:
```
frontend/src/pages/PublicPropertyListPage.tsx
frontend/src/pages/PublicPropertyDetailPage.tsx
```

**コンポーネント**:
```
frontend/src/components/PublicProperty*.tsx
```

#### 3.1.3 共通ファイル（Shared）
これらのファイルが変更されたとき、両方のプロジェクトをデプロイ：

```
frontend/src/components/（上記以外の共通コンポーネント）
frontend/src/utils/
frontend/src/types/
frontend/src/hooks/
frontend/src/services/
frontend/src/store/
frontend/package.json
frontend/vite.config.ts
frontend/tsconfig.json
frontend/index.html
frontend/public/
```

### 3.2 デプロイ判定フローチャート

```
変更ファイルを検出
    ↓
管理画面専用ファイルのみ？
    ↓ Yes
    frontend プロジェクトをデプロイ
    property-site-frontend はスキップ
    ↓ No
公開サイト専用ファイルのみ？
    ↓ Yes
    property-site-frontend プロジェクトをデプロイ
    frontend はスキップ
    ↓ No
共通ファイルが含まれる？
    ↓ Yes
    両方のプロジェクトをデプロイ
```

---

## 4. Ignored Build Step スクリプト設計

### 4.1 スクリプトの配置

```
プロジェクトルート
├── scripts/
│   ├── should-deploy-admin.sh      # 管理画面用
│   └── should-deploy-public.sh     # 公開サイト用
```

### 4.2 管理画面用スクリプト（should-deploy-admin.sh）

**目的**: 管理画面をデプロイすべきか判定

**ロジック**:
1. 前回のデプロイから変更されたファイルを取得
2. 公開サイト専用ファイルのみが変更された場合 → デプロイをスキップ（exit 0）
3. それ以外の場合 → デプロイを実行（exit 1）

**スクリプト**:
```bash
#!/bin/bash

# 前回のデプロイから変更されたファイルを取得
CHANGED_FILES=$(git diff --name-only HEAD^ HEAD)

# 公開サイト専用ファイルのパターン
PUBLIC_ONLY_PATTERNS=(
  "frontend/src/pages/PublicPropertyListPage.tsx"
  "frontend/src/pages/PublicPropertyDetailPage.tsx"
  "frontend/src/components/PublicProperty"
)

# 変更されたファイルが公開サイト専用ファイルのみかチェック
ONLY_PUBLIC_CHANGES=true

for file in $CHANGED_FILES; do
  # frontendディレクトリ以外の変更は管理画面に影響する
  if [[ ! $file =~ ^frontend/ ]]; then
    ONLY_PUBLIC_CHANGES=false
    break
  fi
  
  # 公開サイト専用ファイル以外の変更があるかチェック
  IS_PUBLIC_ONLY=false
  for pattern in "${PUBLIC_ONLY_PATTERNS[@]}"; do
    if [[ $file =~ $pattern ]]; then
      IS_PUBLIC_ONLY=true
      break
    fi
  done
  
  if [[ $IS_PUBLIC_ONLY == false ]]; then
    ONLY_PUBLIC_CHANGES=false
    break
  fi
done

# 公開サイト専用ファイルのみが変更された場合はデプロイをスキップ
if [[ $ONLY_PUBLIC_CHANGES == true ]]; then
  echo "✅ Only public site files changed. Skipping admin deployment."
  exit 0
else
  echo "🚀 Admin files or shared files changed. Proceeding with deployment."
  exit 1
fi
```

### 4.3 公開サイト用スクリプト（should-deploy-public.sh）

**目的**: 公開サイトをデプロイすべきか判定

**ロジック**:
1. 前回のデプロイから変更されたファイルを取得
2. 管理画面専用ファイルのみが変更された場合 → デプロイをスキップ（exit 0）
3. それ以外の場合 → デプロイを実行（exit 1）

**スクリプト**:
```bash
#!/bin/bash

# 前回のデプロイから変更されたファイルを取得
CHANGED_FILES=$(git diff --name-only HEAD^ HEAD)

# 管理画面専用ファイルのパターン
ADMIN_ONLY_PATTERNS=(
  "frontend/src/pages/SellerListPage.tsx"
  "frontend/src/pages/SellerDetailPage.tsx"
  "frontend/src/pages/CallModePage.tsx"
  "frontend/src/pages/PropertyListPage.tsx"
  "frontend/src/pages/PropertyDetailPage.tsx"
  "frontend/src/pages/BuyerListPage.tsx"
  "frontend/src/pages/BuyerDetailPage.tsx"
  "frontend/src/pages/BuyerNearbyPropertiesPage.tsx"
  "frontend/src/pages/WorkTaskListPage.tsx"
  "frontend/src/pages/NewBuyerPage.tsx"
  "frontend/src/components/Seller"
  "frontend/src/components/Buyer"
  "frontend/src/components/WorkTask"
  "frontend/src/components/CallMode"
  "frontend/src/components/Property"
)

# 変更されたファイルが管理画面専用ファイルのみかチェック
ONLY_ADMIN_CHANGES=true

for file in $CHANGED_FILES; do
  # frontendディレクトリ以外の変更は公開サイトに影響する可能性がある
  if [[ ! $file =~ ^frontend/ ]]; then
    ONLY_ADMIN_CHANGES=false
    break
  fi
  
  # PublicProperty*は公開サイト専用なので除外
  if [[ $file =~ frontend/src/components/PublicProperty ]]; then
    ONLY_ADMIN_CHANGES=false
    break
  fi
  
  # 管理画面専用ファイル以外の変更があるかチェック
  IS_ADMIN_ONLY=false
  for pattern in "${ADMIN_ONLY_PATTERNS[@]}"; do
    if [[ $file =~ $pattern ]]; then
      IS_ADMIN_ONLY=true
      break
    fi
  done
  
  if [[ $IS_ADMIN_ONLY == false ]]; then
    ONLY_ADMIN_CHANGES=false
    break
  fi
done

# 管理画面専用ファイルのみが変更された場合はデプロイをスキップ
if [[ $ONLY_ADMIN_CHANGES == true ]]; then
  echo "✅ Only admin files changed. Skipping public site deployment."
  exit 0
else
  echo "🚀 Public site files or shared files changed. Proceeding with deployment."
  exit 1
fi
```

---

## 5. Vercel設定

### 5.1 管理画面プロジェクト（frontend）の設定

**Vercel Dashboard → Settings → Git**:

| 設定項目 | 値 |
|---------|-----|
| **Ignored Build Step** | `bash scripts/should-deploy-admin.sh` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |
| **Root Directory** | `frontend` |

### 5.2 公開サイトプロジェクト（property-site-frontend）の設定

**Vercel Dashboard → Settings → Git**:

| 設定項目 | 値 |
|---------|-----|
| **Ignored Build Step** | `bash scripts/should-deploy-public.sh` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |
| **Root Directory** | `frontend` |

---

## 6. 後方互換性の保証

### 6.1 URL構造の維持

**重要**: この変更では、既存のURLは全て維持されます。

#### 管理画面のURL（変更なし）
```
https://frontend.vercel.app/sellers
https://frontend.vercel.app/properties
https://frontend.vercel.app/buyers
https://frontend.vercel.app/work-tasks
```

#### 公開サイトのURL（変更なし）
```
https://property-site-frontend-kappa.vercel.app/public/properties
https://property-site-frontend-kappa.vercel.app/public/properties/AA5030
https://property-site-frontend-kappa.vercel.app/public/properties?propertyNumber=AA5030
```

### 6.2 APIエンドポイントの維持

**重要**: 既存のAPIエンドポイントは全て維持されます。

```
/api/sellers
/api/properties
/api/buyers
/api/public/properties
/api/public/properties/:id
```

### 6.3 検証方法

デプロイ後、以下のURLが正常に動作することを確認：

```bash
# 公開サイト - パスパラメータ
curl https://property-site-frontend-kappa.vercel.app/public/properties/AA5030

# 公開サイト - クエリパラメータ
curl "https://property-site-frontend-kappa.vercel.app/public/properties?propertyNumber=AA5030"

# 公開サイト - UUID形式
curl https://property-site-frontend-kappa.vercel.app/public/properties/90de1182-b015-430d-9d53-4ccf9dc2591a

# 管理画面 - 売主リスト
curl https://frontend.vercel.app/api/sellers

# 管理画面 - 物件リスト
curl https://frontend.vercel.app/api/properties
```

---

## 7. デプロイフロー

### 7.1 管理画面専用ファイルを変更した場合

```
1. 開発者が SellerListPage.tsx を変更
2. Git commit & push
3. Vercel が変更を検出
4. frontend プロジェクト:
   - should-deploy-admin.sh を実行
   - 管理画面専用ファイルが変更されたことを検出
   - デプロイを実行（exit 1）
5. property-site-frontend プロジェクト:
   - should-deploy-public.sh を実行
   - 管理画面専用ファイルのみが変更されたことを検出
   - デプロイをスキップ（exit 0）
```

### 7.2 公開サイト専用ファイルを変更した場合

```
1. 開発者が PublicPropertyListPage.tsx を変更
2. Git commit & push
3. Vercel が変更を検出
4. frontend プロジェクト:
   - should-deploy-admin.sh を実行
   - 公開サイト専用ファイルのみが変更されたことを検出
   - デプロイをスキップ（exit 0）
5. property-site-frontend プロジェクト:
   - should-deploy-public.sh を実行
   - 公開サイト専用ファイルが変更されたことを検出
   - デプロイを実行（exit 1）
```

### 7.3 共通ファイルを変更した場合

```
1. 開発者が frontend/src/utils/api.ts を変更
2. Git commit & push
3. Vercel が変更を検出
4. frontend プロジェクト:
   - should-deploy-admin.sh を実行
   - 共通ファイルが変更されたことを検出
   - デプロイを実行（exit 1）
5. property-site-frontend プロジェクト:
   - should-deploy-public.sh を実行
   - 共通ファイルが変更されたことを検出
   - デプロイを実行（exit 1）
```

---

## 8. エラーハンドリング

### 8.1 スクリプトエラー

**問題**: スクリプトが実行できない

**対策**:
- スクリプトに実行権限を付与: `chmod +x scripts/*.sh`
- Vercel環境でBashが利用可能であることを確認

### 8.2 Git履歴が取得できない

**問題**: `git diff`が失敗する

**対策**:
- Vercelは自動的にGit履歴を取得するため、通常は問題なし
- 初回デプロイ時は全てのファイルが変更されたとみなされる

### 8.3 誤ったデプロイ判定

**問題**: デプロイすべきなのにスキップされる

**対策**:
- スクリプトのロジックを見直す
- 保守的なアプローチ: 不明な場合はデプロイを実行

---

## 9. モニタリングとログ

### 9.1 デプロイログの確認

Vercel Dashboard → Deployments → 各デプロイ → Build Logs

**確認項目**:
- Ignored Build Stepの実行結果
- スクリプトの出力メッセージ
- デプロイがスキップされたかどうか

### 9.2 デプロイ統計

**追跡する指標**:
- デプロイ回数（プロジェクトごと）
- スキップされたデプロイ回数
- デプロイ時間の短縮率

---

## 10. テスト計画

### 10.1 単体テスト

**テスト対象**: Ignored Build Stepスクリプト

**テストケース**:

| テストケース | 変更ファイル | 期待される結果（管理画面） | 期待される結果（公開サイト） |
|------------|------------|----------------------|----------------------|
| TC-1 | SellerListPage.tsx | デプロイ実行 | デプロイスキップ |
| TC-2 | PublicPropertyListPage.tsx | デプロイスキップ | デプロイ実行 |
| TC-3 | frontend/src/utils/api.ts | デプロイ実行 | デプロイ実行 |
| TC-4 | SellerListPage.tsx + PublicPropertyListPage.tsx | デプロイ実行 | デプロイ実行 |
| TC-5 | backend/api/index.ts | デプロイ実行 | デプロイ実行 |

### 10.2 統合テスト

**テスト手順**:
1. 各テストケースのファイルを変更
2. Git commit & push
3. Vercel Dashboardでデプロイ状況を確認
4. 期待される結果と一致するか確認

### 10.3 受け入れテスト

**テスト項目**:
- [ ] 管理画面の全ての機能が正常に動作する
- [ ] 公開サイトの全ての機能が正常に動作する
- [ ] 既存のURLが全て動作する
- [ ] APIエンドポイントが全て動作する
- [ ] デプロイ時間が短縮される

---

## 11. ロールバック計画

### 11.1 ロールバック手順

**問題が発生した場合**:

1. Vercel Dashboard → Settings → Git
2. Ignored Build Stepを削除（空欄にする）
3. 両方のプロジェクトが常にデプロイされる状態に戻る

### 11.2 ロールバック判断基準

以下の場合はロールバックを検討：
- デプロイが頻繁に失敗する
- スクリプトのエラーが解決できない
- デプロイ時間が逆に増加する

---

## 12. 保守とメンテナンス

### 12.1 新しいページを追加する場合

**手順**:
1. ページが管理画面専用か公開サイト専用かを判断
2. 該当するスクリプトにファイルパターンを追加
3. テストを実行して動作確認

**例**: 新しい管理画面ページ `TaskListPage.tsx` を追加

```bash
# scripts/should-deploy-admin.sh に追加不要（管理画面専用ファイル）
# scripts/should-deploy-public.sh の ADMIN_ONLY_PATTERNS に追加
ADMIN_ONLY_PATTERNS=(
  # ... 既存のパターン
  "frontend/src/pages/TaskListPage.tsx"
)
```

### 12.2 定期的なレビュー

**頻度**: 3ヶ月ごと

**確認項目**:
- スクリプトのロジックが正しいか
- 新しいファイルが適切に分類されているか
- デプロイ統計を確認

---

## 13. セキュリティ考慮事項

### 13.1 スクリプトの安全性

- スクリプトは読み取り専用の操作のみ実行
- ファイルの変更や削除は行わない
- 環境変数やシークレットは使用しない

### 13.2 アクセス制御

- Vercel Dashboardへのアクセスは制限
- スクリプトの変更は承認が必要

---

## 14. パフォーマンス最適化

### 14.1 期待される改善

**デプロイ時間**:
- 現状: 両方のプロジェクトが毎回デプロイ（約10分）
- 改善後: 必要なプロジェクトのみデプロイ（約5分）
- **削減率: 50%**

**ビルド回数**:
- 現状: 月間約200回のデプロイ（両方のプロジェクト）
- 改善後: 月間約100回のデプロイ（必要なプロジェクトのみ）
- **削減率: 50%**

### 14.2 コスト削減

**Vercelの料金**:
- ビルド時間の削減により、Vercelの料金が削減される可能性
- 具体的な削減額はプランによる

---

## 15. まとめ

### 15.1 設計の利点

1. **デプロイ時間の短縮**: 不要なビルドをスキップ
2. **リスクの低減**: 管理画面と公開サイトが独立
3. **コードの変更不要**: 設定のみで対応
4. **後方互換性の保証**: 既存のURLとAPIは全て維持

### 15.2 設計の制約

1. **スクリプトの保守**: ファイルパターンの定期的な更新が必要
2. **Vercel依存**: Vercelの機能に依存
3. **初回デプロイ**: 初回は両方のプロジェクトがデプロイされる

### 15.3 次のステップ

1. スクリプトの作成
2. Vercel設定の適用
3. テストと検証
4. 本番環境への適用

---

**作成日**: 2026年2月14日  
**作成者**: Kiro AI  
**ステータス**: Draft  
**関連ドキュメント**: 
- `.kiro/specs/vercel-deploy-separation/requirements.md`
- `.kiro/steering/backward-compatibility-rule.md`
- `.kiro/steering/system-isolation-rule.md`
