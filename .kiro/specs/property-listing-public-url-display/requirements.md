# 物件リスト公開URL表示機能

## 概要
物件リスト画面に、各物件の公開物件サイト詳細ページURLを表示する機能を追加します。

## 背景
- 公開物件サイト（`/public/properties/:id`）が既に実装されている
- 物件リスト画面から公開URLを簡単に確認・共有できるようにしたい
- 営業担当者が顧客に物件URLを送る際の利便性を向上させる

## 目標
1. 物件リスト画面に公開URLを表示
2. URLをクリップボードにコピーできる機能
3. 公開中の物件のみURLを表示（atbb_status = '専任・公開中'）

## 要件

### 機能要件

#### 1. 公開URL生成ロジック
- **動的生成方式を採用**（DBに保存しない）
- フォーマット: `${FRONTEND_URL}/public/properties/${property.id}`
- 公開中の物件のみURL生成（atbb_status = '専任・公開中'）
- 非公開物件は「-」または「非公開」と表示

#### 2. フロントエンド表示
- 物件リストテーブルに「公開URL」カラムを追加
- URLの表示形式:
  - 短縮表示（例: `...properties/abc123`）
  - ツールチップで完全URL表示
  - コピーボタン付き
- 公開中の物件のみURLを表示
- 非公開物件は「-」と表示

#### 3. コピー機能
- URLをクリップボードにコピー
- コピー成功時にトースト通知
- コピー失敗時にエラー通知

### 非機能要件

#### パフォーマンス
- URL生成はクライアントサイドで実行（サーバー負荷なし）
- 既存のAPIレスポンスに影響を与えない

#### セキュリティ
- 公開URLは認証不要でアクセス可能（既存の公開サイト仕様）
- 非公開物件のURLは生成しない

#### 保守性
- URL生成ロジックを共通ユーティリティ関数化
- 環境変数でベースURLを管理

## 実装方針

### オプション1: 動的生成（推奨）
**メリット:**
- DBスキーマ変更不要
- マイグレーション不要
- 即座に実装可能
- URLフォーマット変更が容易

**デメリット:**
- なし（URLは固定パターンで生成可能）

### オプション2: DB保存
**メリット:**
- カスタムURL対応可能（将来的な拡張性）

**デメリット:**
- マイグレーション必要
- 既存データのバックフィル必要
- 保守コスト増加
- 現時点で不要な機能

**決定: オプション1（動的生成）を採用**

## 技術仕様

### フロントエンド

#### 新規ファイル
- `frontend/src/utils/publicUrlGenerator.ts` - URL生成ユーティリティ
- `frontend/src/components/PublicUrlCell.tsx` - URL表示セル（オプション）

#### 修正ファイル
- `frontend/src/pages/PropertyListingsPage.tsx` - テーブルにカラム追加

#### URL生成ロジック
```typescript
export const generatePublicPropertyUrl = (
  propertyId: string,
  atbbStatus: string | null
): string | null => {
  // 公開中の物件のみURLを生成
  if (atbbStatus !== '専任・公開中') {
    return null;
  }
  
  const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
  return `${baseUrl}/public/properties/${propertyId}`;
};
```

### バックエンド
- **変更なし**（既存APIをそのまま使用）

## UI/UX設計

### 物件リストテーブル
```
| 物件番号 | 担当 | 種別 | ... | 公開URL | ステータス |
|---------|------|------|-----|---------|-----------|
| AA12345 | 山田 | 戸建 | ... | [📋 コピー] .../abc123 | 専任・公開中 |
| AA12346 | 佐藤 | 土地 | ... | - | 契約済 |
```

### コピーボタン
- アイコン: 📋（クリップボード）
- ホバー時: ツールチップ「URLをコピー」
- クリック時: トースト「URLをコピーしました」

## テストケース

### 単体テスト
1. URL生成関数のテスト
   - 公開中物件: 正しいURL生成
   - 非公開物件: null返却
   - 無効なID: エラーハンドリング

### 統合テスト
1. 物件リスト表示
   - 公開中物件にURLが表示される
   - 非公開物件に「-」が表示される
2. コピー機能
   - URLが正しくコピーされる
   - トースト通知が表示される

## 実装順序

### Phase 1: 基本実装
1. URL生成ユーティリティ作成
2. 物件リストテーブルにカラム追加
3. 基本的な表示機能実装

### Phase 2: UX改善
1. コピーボタン実装
2. ツールチップ追加
3. トースト通知実装

## 参考情報

### 既存の公開物件サイト
- ルート: `/public/properties/:id`
- 実装ファイル:
  - `frontend/src/pages/PublicPropertyDetailPage.tsx`
  - `backend/src/routes/publicProperties.ts`
- 公開条件: `atbb_status = '専任・公開中'`

### 物件リスト画面
- ファイル: `frontend/src/pages/PropertyListingsPage.tsx`
- API: `/api/property-listings`
- サービス: `backend/src/services/PropertyListingService.ts`

## 成功基準
1. 物件リスト画面に公開URLカラムが表示される
2. 公開中の物件のみURLが表示される
3. URLをクリップボードにコピーできる
4. 既存機能に影響を与えない

## リスク
- なし（既存機能への影響なし、DBスキーマ変更なし）

## 今後の拡張可能性
1. QRコード生成機能
2. SNSシェア機能
3. カスタムURL設定（必要に応じて）
