# 買主リスト - 近隣物件一覧画面のテーブル表示項目変更

## 📋 概要

買主詳細ページの「近隣物件」ボタンから遷移する近隣物件一覧画面（`BuyerNearbyPropertiesPage.tsx`）のテーブル表示項目を変更する。

## 🎯 目標

近隣物件一覧画面のテーブルに、買主が物件を比較検討する際に必要な情報を表示する。

## 📊 現在の問題

### 問題1: 不要な列が表示されている

- 「売出価格」列が表示されているが、買主には「価格」（BS列）のみを表示すれば十分
- 「土地面積」「建物面積」列が表示されているが、詳細すぎて一覧画面では不要

### 問題2: 必要な列が表示されていない

- マンションの場合は「ペット」情報（BB列）が表示されていない
- 「内覧前伝達事項」（BQ列）が表示されていない

## ✅ 要件

### 1. ユーザーストーリー

**As a** 買主担当者  
**I want to** 近隣物件一覧画面で必要な情報を一目で確認したい  
**So that** 買主に提案する物件を効率的に選定できる

### 2. 受け入れ基準

#### 2.1 テーブル表示項目の変更

**変更前**:
| 物件番号 | 住所 | 種別 | 価格 | 売出価格 | ステータス | 担当 | 間取り | 土地面積 | 建物面積 |

**変更後**:
| 物件番号 | 住所 | 種別 | 価格 | ステータス | 担当 | 間取り | ペット | 内覧前伝達事項 |

**注意**: 「ペット」列はマンションの場合のみ表示されます。

#### 2.2 各列の詳細

| 列名 | データソース | 表示条件 | 備考 |
|------|------------|---------|------|
| 物件番号 | `property_number` | 常に表示 | 変更なし |
| 住所 | `display_address` または `address` | 常に表示 | 変更なし |
| 種別 | `property_type` | 常に表示 | 変更なし |
| 価格 | `sales_price`（BS列） | 常に表示 | 「売出価格」を削除し、「価格」のみ表示 |
| ステータス | `atbb_status` | 常に表示 | 変更なし |
| 担当 | `sales_assignee` | 常に表示 | 変更なし |
| 間取り | `floor_plan` | 常に表示 | 変更なし |
| ペット | `pet_allowed`（BB列） | マンションの場合のみ表示 | 新規追加 |
| 内覧前伝達事項 | `property_about`（BQ列、`●内覧前伝達事項`） | 常に表示 | 既存カラム（`pre_viewing_notes`ではない） |

#### 2.3 削除する列

- ❌ 「売出価格」（`listing_price`）
- ❌ 「土地面積」（`land_area`）
- ❌ 「建物面積」（`building_area`）

#### 2.4 追加する列

- ✅ 「ペット」（`pet_allowed`）- マンションの場合のみ表示
- ✅ 「内覧前伝達事項」（`property_about`）- 既存カラム

### 3. 技術的要件

#### 3.1 フロントエンド

**ファイル**: `frontend/src/pages/BuyerNearbyPropertiesPage.tsx`

**変更内容**:
1. `PropertyListing`インターフェースに以下を追加:
   - `pet_allowed?: string;`
   - `property_about?: string;` （`pre_viewing_notes`ではない）

2. テーブルヘッダーを変更:
   - 「売出価格」を削除
   - 「土地面積」「建物面積」を削除
   - 「ペット」を追加（マンションの場合のみ表示）
   - 「内覧前伝達事項」を追加

3. テーブルボディを変更:
   - 「売出価格」セルを削除
   - 「土地面積」「建物面積」セルを削除
   - 「ペット」セルを追加（マンションの場合のみ表示、`pet_allowed`を表示）
   - 「内覧前伝達事項」セルを追加（`property_about`を表示）

#### 3.2 バックエンド

**ファイル**: `backend/src/routes/buyers.ts`

**変更内容**:
- `GET /api/buyers/:id/nearby-properties`エンドポイントのレスポンスに以下を追加:
  - `pet_allowed`
  - `property_about` （`pre_viewing_notes`ではない）

**確認事項**:
- `property_listings`テーブルに`property_about`カラムは既に存在する（BQ列から同期済み）
- `pet_allowed`カラムが存在するか確認
- 存在しない場合は、スプレッドシートから同期する必要がある

### 4. データマッピング

#### 4.1 スプレッドシート「物件」シートのカラムマッピング

| 列名 | スプレッドシート列 | スプレッドシートヘッダー名 | データベースカラム | 備考 |
|------|------------------|------------------------|------------------|------|
| 価格 | BS列 | （要確認） | `sales_price` | 既存 |
| ペット | BB列 | （要確認） | `pet_allowed` | 新規（マンションの場合のみ表示） |
| 内覧前伝達事項 | BQ列 | `●内覧前伝達事項` | `property_about` | 既存（`pre_viewing_notes`ではなく`property_about`） |

**重要な修正**:
- 「内覧前伝達事項」は`property_about`カラムに対応（`pre_viewing_notes`ではない）
- `property_about`は既に`property_listings`テーブルに存在する
- スプレッドシートのBQ列（`●内覧前伝達事項`）から取得される
- 「ペット」列はマンションの場合のみ表示される

**参考**: `.kiro/steering/property-listing-column-mapping.md`

### 5. 表示ロジック

#### 5.1 「ペット」列の表示ロジック

```typescript
// マンションの場合のみ表示
if (property.property_type === 'マンション') {
  return property.pet_allowed || '-';
}

// マンション以外の場合は列自体を非表示
return null;
```

**注意**: テーブルヘッダーとボディの両方で、マンションの場合のみ「ペット」列を表示する必要があります。

#### 5.2 「内覧前伝達事項」列の表示ロジック

```typescript
// 長いテキストの場合は省略表示
const maxLength = 50;
if (property.property_about && property.property_about.length > maxLength) {
  return `${property.property_about.substring(0, maxLength)}...`;
}
return property.property_about || '-';
```

## 🚨 制約事項

### 1. システム隔離ルール

- ✅ 買主リスト専用のファイルのみを変更する
- ❌ 売主リスト、物件リスト、物件公開サイトのファイルは変更しない

### 2. 後方互換性

- ✅ 既存のAPIエンドポイントは変更しない（レスポンスに項目を追加するのみ）
- ✅ 既存の機能（近隣物件検索ロジック）は変更しない

### 3. データ同期

- ✅ `property_listings`テーブルに新しいカラムが存在しない場合は、スプレッドシートから同期する
- ✅ 自動同期サービス（`EnhancedAutoSyncService`）で新しいカラムを同期対象に追加する

## 📋 タスク

### Phase 1: データベース確認

1. [ ] `property_listings`テーブルに以下のカラムが存在するか確認:
   - `pet_allowed`
   - `property_about` （既に存在するはず）

2. [ ] 存在しないカラム（`pet_allowed`）がある場合は、マイグレーションを作成してカラムを追加

### Phase 2: バックエンド修正

1. [ ] `backend/src/routes/buyers.ts`の`GET /api/buyers/:id/nearby-properties`エンドポイントを修正
   - レスポンスに`pet_allowed`、`property_about`を追加

2. [ ] スプレッドシート同期サービスを修正（必要な場合）
   - `pet_allowed`を同期対象に追加
   - `property_about`は既に同期済み

### Phase 3: フロントエンド修正

1. [ ] `frontend/src/pages/BuyerNearbyPropertiesPage.tsx`を修正
   - `PropertyListing`インターフェースに新しいフィールドを追加
   - テーブルヘッダーを変更
   - テーブルボディを変更
   - 「ペット」列の表示ロジックを実装（マンションの場合のみ表示）
   - 「内覧前伝達事項」列の表示ロジックを実装

### Phase 4: テスト

1. [ ] 近隣物件一覧画面を開いて、テーブル表示を確認
2. [ ] マンション物件の場合、「ペット」列が表示されることを確認
3. [ ] マンション以外の物件の場合、「ペット」列が表示されないことを確認
4. [ ] 「内覧前伝達事項」列が表示されることを確認

## 🎯 成功指標

1. ✅ 近隣物件一覧画面のテーブルに「価格」「ペット」（マンションの場合のみ）「内覧前伝達事項」が表示される
2. ✅ 「売出価格」「土地面積」「建物面積」が表示されない
3. ✅ マンション物件の場合、「ペット」列が表示される
4. ✅ マンション以外の物件の場合、「ペット」列が表示されない

## 📚 関連ドキュメント

- `.kiro/steering/buyer-table-column-definition.md` - 買主テーブルのカラム定義
- `.kiro/steering/system-isolation-rule.md` - システム隔離ルール
- `.kiro/specs/buyer-nearby-properties-distance-based/requirements.md` - 近隣物件検索の拡張（距離ベース）

---

**作成日**: 2026年2月11日  
**作成理由**: 買主担当者が近隣物件を効率的に比較検討できるようにするため
