# Vercelデプロイ分離 - 要件定義

## 1. 概要

### 1.1 背景
現在、`frontend`ディレクトリが以下の2つのシステムで共有されています：
- **物件リスト管理画面**（内部管理用）
- **公開物件サイト**（一般公開用）

この状態では、管理画面の変更が公開サイトに影響を与え、不要なデプロイが発生する問題があります。

### 1.2 目的
Vercelのデプロイ設定を使用して、2つのシステムのデプロイを分離し、それぞれが独立してデプロイされるようにします。

### 1.3 スコープ
- Vercelの`Ignored Build Step`設定を使用
- コードの変更は最小限に抑える
- 既存の機能に影響を与えない

---

## 2. 現状分析

### 2.1 現在のVercelプロジェクト構成

#### プロジェクト1: `frontend`
- **用途**: 物件リスト管理画面（内部管理用）
- **ディレクトリ**: `frontend/`
- **主要ページ**:
  - `SellerListPage.tsx` - 売主リスト
  - `PropertyListPage.tsx` - 物件リスト
  - `BuyerListPage.tsx` - 買主リスト
  - `WorkTaskListPage.tsx` - 業務リスト

#### プロジェクト2: `property-site-frontend`
- **用途**: 公開物件サイト（一般公開用）
- **ディレクトリ**: `frontend/`（同じディレクトリ）
- **主要ページ**:
  - `PublicPropertyListPage.tsx` - 公開物件一覧
  - `PublicPropertyDetailPage.tsx` - 公開物件詳細

### 2.2 問題点

1. **不要なデプロイ**:
   - 管理画面のファイルを変更すると、公開サイトもデプロイされる
   - 公開サイトのファイルを変更すると、管理画面もデプロイされる

2. **デプロイ時間の無駄**:
   - 両方のプロジェクトが毎回ビルドされる
   - ビルド時間が2倍になる

3. **リスク**:
   - 管理画面の変更が公開サイトに影響を与える可能性
   - 意図しない変更が本番環境に反映される

---

## 3. ユーザーストーリー

### 3.1 管理画面の開発者として
**As a** 管理画面の開発者  
**I want to** 管理画面のファイルを変更したときに、管理画面のみがデプロイされる  
**So that** 公開サイトに影響を与えず、デプロイ時間を短縮できる

**受け入れ基準**:
- [ ] `SellerListPage.tsx`を変更したとき、`frontend`プロジェクトのみがデプロイされる
- [ ] `property-site-frontend`プロジェクトはデプロイされない
- [ ] 既存の機能に影響がない

### 3.2 公開サイトの開発者として
**As a** 公開サイトの開発者  
**I want to** 公開サイトのファイルを変更したときに、公開サイトのみがデプロイされる  
**So that** 管理画面に影響を与えず、デプロイ時間を短縮できる

**受け入れ基準**:
- [ ] `PublicPropertyListPage.tsx`を変更したとき、`property-site-frontend`プロジェクトのみがデプロイされる
- [ ] `frontend`プロジェクトはデプロイされない
- [ ] 既存の機能に影響がない

### 3.3 共通コンポーネントの開発者として
**As a** 共通コンポーネントの開発者  
**I want to** 共通コンポーネントを変更したときに、両方のプロジェクトがデプロイされる  
**So that** 両方のシステムで最新のコンポーネントが使用される

**受け入れ基準**:
- [ ] `frontend/src/components/`の共通コンポーネントを変更したとき、両方のプロジェクトがデプロイされる
- [ ] 既存の機能に影響がない

---

## 4. 機能要件

### 4.1 デプロイ分離ルール

#### 4.1.1 管理画面専用ファイル
以下のファイルが変更されたとき、`frontend`プロジェクトのみをデプロイ：

**ページ**:
- `frontend/src/pages/SellerListPage.tsx`
- `frontend/src/pages/SellerDetailPage.tsx`
- `frontend/src/pages/CallModePage.tsx`
- `frontend/src/pages/PropertyListPage.tsx`
- `frontend/src/pages/PropertyDetailPage.tsx`
- `frontend/src/pages/BuyerListPage.tsx`
- `frontend/src/pages/BuyerDetailPage.tsx`
- `frontend/src/pages/WorkTaskListPage.tsx`

**コンポーネント**:
- `frontend/src/components/Seller*.tsx`
- `frontend/src/components/Property*.tsx`（`PublicProperty*`を除く）
- `frontend/src/components/Buyer*.tsx`
- `frontend/src/components/WorkTask*.tsx`

#### 4.1.2 公開サイト専用ファイル
以下のファイルが変更されたとき、`property-site-frontend`プロジェクトのみをデプロイ：

**ページ**:
- `frontend/src/pages/PublicPropertyListPage.tsx`
- `frontend/src/pages/PublicPropertyDetailPage.tsx`

**コンポーネント**:
- `frontend/src/components/PublicProperty*.tsx`

#### 4.1.3 共通ファイル
以下のファイルが変更されたとき、両方のプロジェクトをデプロイ：

- `frontend/src/components/`（上記以外の共通コンポーネント）
- `frontend/src/utils/`
- `frontend/src/types/`
- `frontend/src/hooks/`
- `frontend/package.json`
- `frontend/vite.config.ts`

### 4.2 Vercel設定

#### 4.2.1 `frontend`プロジェクトの設定
- **Ignored Build Step**: 公開サイト専用ファイルが変更されたときはビルドをスキップ
- **ビルドコマンド**: `npm run build`
- **出力ディレクトリ**: `dist`

#### 4.2.2 `property-site-frontend`プロジェクトの設定
- **Ignored Build Step**: 管理画面専用ファイルが変更されたときはビルドをスキップ
- **ビルドコマンド**: `npm run build`
- **出力ディレクトリ**: `dist`

---

## 5. 非機能要件

### 5.1 パフォーマンス
- デプロイ時間を50%削減（不要なビルドをスキップ）
- ビルド時間は現状と同等

### 5.2 信頼性
- 既存の機能に影響を与えない
- デプロイの失敗率を増加させない

### 5.3 保守性
- 設定は明確で理解しやすい
- 将来的にファイルを追加しても対応できる

---

## 6. 制約条件

### 6.1 技術的制約
- Vercelの`Ignored Build Step`機能を使用
- コードの変更は最小限に抑える
- 既存のディレクトリ構造を維持

### 6.2 運用上の制約
- 既存のデプロイフローを変更しない
- 既存の環境変数を維持

---

## 7. 受け入れ基準

### 7.1 デプロイ分離
- [ ] 管理画面専用ファイルを変更したとき、管理画面のみがデプロイされる
- [ ] 公開サイト専用ファイルを変更したとき、公開サイトのみがデプロイされる
- [ ] 共通ファイルを変更したとき、両方のプロジェクトがデプロイされる

### 7.2 機能維持
- [ ] 管理画面の全ての機能が正常に動作する
- [ ] 公開サイトの全ての機能が正常に動作する
- [ ] 既存のAPIエンドポイントが正常に動作する

### 7.3 パフォーマンス
- [ ] デプロイ時間が50%削減される（不要なビルドをスキップ）
- [ ] ビルド時間は現状と同等

---

## 8. 実装の優先順位

### Phase 1: 設定の準備（高優先度）
1. Vercelの`Ignored Build Step`スクリプトを作成
2. 管理画面と公開サイトのファイルパターンを定義

### Phase 2: Vercel設定の適用（高優先度）
1. `frontend`プロジェクトに`Ignored Build Step`を設定
2. `property-site-frontend`プロジェクトに`Ignored Build Step`を設定

### Phase 3: テストと検証（高優先度）
1. 管理画面専用ファイルを変更してデプロイをテスト
2. 公開サイト専用ファイルを変更してデプロイをテスト
3. 共通ファイルを変更してデプロイをテスト

---

## 9. リスクと対策

### 9.1 リスク1: 設定ミスによるデプロイ失敗
**影響**: 高  
**対策**: 
- テスト環境で事前に検証
- ロールバック手順を準備

### 9.2 リスク2: ファイルパターンの誤り
**影響**: 中  
**対策**: 
- ファイルパターンを明確に定義
- 定期的にレビュー

### 9.3 リスク3: 共通ファイルの判定ミス
**影響**: 中  
**対策**: 
- 共通ファイルは両方のプロジェクトをデプロイ
- 保守的なアプローチを採用

---

## 10. 成功の指標

### 10.1 定量的指標
- デプロイ時間が50%削減される
- 不要なデプロイが0件になる

### 10.2 定性的指標
- 開発者がデプロイの分離を理解している
- デプロイの失敗率が増加していない

---

## 11. 参考資料

### 11.1 Vercel公式ドキュメント
- [Ignored Build Step](https://vercel.com/docs/concepts/projects/overview#ignored-build-step)

### 11.2 関連ステアリングルール
- `.kiro/steering/system-isolation-rule.md` - システム隔離ルール
- `.kiro/steering/project-isolation-rule.md` - プロジェクト隔離ルール

---

**作成日**: 2026年2月14日  
**作成者**: Kiro AI  
**ステータス**: Draft
