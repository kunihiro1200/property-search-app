# Property Details同期修正 - 設計ドキュメント

## 1. アーキテクチャ概要

### 1.1 システム構成

```
┌─────────────────────────────────────────────────────────────┐
│                  PropertyListingSyncService                  │
│                                                              │
│  syncUpdatedPropertyListings()                              │
│         ↓                                                    │
│  updatePropertyDetailsFromSheets() ← 現在コメントアウト      │
│         ↓                                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  並列データ取得                                        │  │
│  │  ├─ PropertyService.getPropertyAbout()               │  │
│  │  ├─ RecommendedCommentService.getRecommendedComment()│  │
│  │  ├─ FavoriteCommentService.getFavoriteComment()      │  │
│  │  └─ AthomeDataService.getAthomeData()                │  │
│  └──────────────────────────────────────────────────────┘  │
│         ↓                                                    │
│  PropertyDetailsService.upsertPropertyDetails()             │
│         ↓                                                    │
│  property_detailsテーブルに保存                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 問題の特定

**現在の問題**:
```typescript
// PropertyListingSyncService.ts 行768
// 一時的に無効化: sellersテーブルのcommentsカラムエラーを回避
// await this.updatePropertyDetailsFromSheets(update.property_number);
```

この行がコメントアウトされているため、`property_details`テーブルにコメントデータが保存されません。

---

## 2. 詳細設計

### 2.1 問題の根本原因調査

#### 2.1.1 `sellers`テーブルの`comments`カラムエラーとは？

**調査が必要な項目**:
1. `sellers`テーブルに`comments`カラムが存在するか？
2. `PropertyService.getPropertyAbout()`が`sellers`テーブルを参照しているか？
3. エラーメッセージの内容は？

**調査方法**:
```typescript
// 1. sellersテーブルのスキーマを確認
const { data, error } = await supabase
  .from('sellers')
  .select('*')
  .limit(1);

// 2. PropertyService.getPropertyAbout()の実装を確認
// → 物件リストスプレッドシートから取得している（sellersテーブルは使用していない）
```

**結論**: `PropertyService.getPropertyAbout()`は物件リストスプレッドシートから直接取得しており、`sellers`テーブルは使用していません。したがって、コメントアウトの理由は誤解または古い情報に基づいている可能性があります。

### 2.2 解決策の設計

#### 2.2.1 アプローチ1: コメントアウトを解除（推奨）

**メリット**:
- 最もシンプル
- 既存のコードを活用
- テスト済みのロジック

**デメリット**:
- 本当に`sellers`テーブルのエラーが発生する場合、問題が再発する

**実装**:
```typescript
// PropertyListingSyncService.ts 行768
// コメントアウトを解除
await this.updatePropertyDetailsFromSheets(update.property_number);
```

**エラーハンドリングの追加**:
```typescript
try {
  await this.updatePropertyDetailsFromSheets(update.property_number);
} catch (error: any) {
  console.error(`[PropertyListingSyncService] Failed to update property details for ${update.property_number}:`, error.message);
  // エラーが発生しても同期処理全体は継続
}
```

#### 2.2.2 アプローチ2: `updatePropertyDetailsFromSheets()`の改善

**改善点**:
1. エラーハンドリングを強化
2. 各サービスのエラーを個別にキャッチ
3. 一部のデータ取得に失敗しても、他のデータは保存する

**実装**:
```typescript
private async updatePropertyDetailsFromSheets(propertyNumber: string): Promise<void> {
  try {
    console.log(`[PropertyListingSyncService] Updating property details for ${propertyNumber}`);
    
    // 必要なサービスを動的にインポート
    const { PropertyService } = await import('./PropertyService');
    const { RecommendedCommentService } = await import('./RecommendedCommentService');
    const { FavoriteCommentService } = await import('./FavoriteCommentService');
    const { AthomeDataService } = await import('./AthomeDataService');
    const { PropertyListingService } = await import('./PropertyListingService');
    const { PropertyDetailsService } = await import('./PropertyDetailsService');
    
    const propertyService = new PropertyService();
    const recommendedCommentService = new RecommendedCommentService();
    const favoriteCommentService = new FavoriteCommentService();
    const athomeDataService = new AthomeDataService();
    const propertyListingService = new PropertyListingService();
    const propertyDetailsService = new PropertyDetailsService();
    
    // 物件情報を取得
    const property = await propertyListingService.getByPropertyNumber(propertyNumber);
    
    if (!property) {
      console.error(`[PropertyListingSyncService] Property not found: ${propertyNumber}`);
      return;
    }
    
    // 並列でデータを取得（エラーハンドリングを個別に）
    const [propertyAbout, recommendedComment, favoriteComment, athomeData] = await Promise.all([
      propertyService.getPropertyAbout(propertyNumber).catch(err => {
        console.error(`[PropertyListingSyncService] Failed to get property_about for ${propertyNumber}:`, err.message);
        return null; // エラーが発生してもnullを返す
      }),
      
      recommendedCommentService.getRecommendedComment(
        propertyNumber,
        property.property_type,
        property.id
      ).catch(err => {
        console.error(`[PropertyListingSyncService] Failed to get recommended_comments for ${propertyNumber}:`, err.message);
        return { comments: [] }; // エラーが発生しても空配列を返す
      }),
      
      favoriteCommentService.getFavoriteComment(property.id).catch(err => {
        console.error(`[PropertyListingSyncService] Failed to get favorite_comment for ${propertyNumber}:`, err.message);
        return { comment: null }; // エラーが発生してもnullを返す
      }),
      
      athomeDataService.getAthomeData(
        propertyNumber,
        property.property_type,
        property.storage_location
      ).catch(err => {
        console.error(`[PropertyListingSyncService] Failed to get athome_data for ${propertyNumber}:`, err.message);
        return { data: [] }; // エラーが発生しても空配列を返す
      })
    ]);
    
    // property_detailsテーブルにupsert
    const success = await propertyDetailsService.upsertPropertyDetails(propertyNumber, {
      property_about: propertyAbout,
      recommended_comments: recommendedComment.comments,
      athome_data: athomeData.data,
      favorite_comment: favoriteComment.comment
    });
    
    if (!success) {
      throw new Error('Failed to upsert property details');
    }
    
    console.log(`[PropertyListingSyncService] Successfully updated property details for ${propertyNumber}`);
    
  } catch (error: any) {
    console.error(`[PropertyListingSyncService] Error updating property details for ${propertyNumber}:`, error.message);
    // エラーをスローせず、ログに記録するだけ
  }
}
```

### 2.3 既存物件の再同期スクリプト

#### 2.3.1 `property_about`が空の物件を検出

**スクリプト**: `backend/backfill-missing-property-about.ts`

```typescript
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { PropertyListingSyncService } from './src/services/PropertyListingSyncService';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

async function backfillMissingPropertyAbout() {
  console.log('🔍 property_aboutが空の物件を検出します...\n');
  
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  
  // 1. property_aboutが空の物件を検出
  const { data: properties, error } = await supabase
    .from('property_details')
    .select('property_number, property_about, recommended_comments, favorite_comment')
    .or('property_about.is.null,property_about.eq.');
  
  if (error) {
    console.error('❌ エラー:', error.message);
    return;
  }
  
  if (!properties || properties.length === 0) {
    console.log('✅ すべての物件にproperty_aboutがあります');
    return;
  }
  
  console.log(`📊 property_aboutが空の物件: ${properties.length}件\n`);
  
  // 2. GoogleSheetsClientを初期化
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.PROPERTY_LISTING_SPREADSHEET_ID!,
    sheetName: process.env.PROPERTY_LISTING_SHEET_NAME || '物件',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  });
  
  await sheetsClient.authenticate();
  
  // 3. PropertyListingSyncServiceを初期化
  const syncService = new PropertyListingSyncService(sheetsClient);
  
  // 4. 各物件のコメントデータを再取得
  let success = 0;
  let failed = 0;
  
  for (const property of properties) {
    try {
      console.log(`🔄 ${property.property_number}: 再同期中...`);
      
      // updatePropertyDetailsFromSheetsを直接呼び出す
      // （privateメソッドなので、一時的にpublicにするか、別の方法を使用）
      await (syncService as any).updatePropertyDetailsFromSheets(property.property_number);
      
      success++;
      console.log(`  ✅ ${property.property_number}: 成功`);
      
    } catch (error: any) {
      failed++;
      console.error(`  ❌ ${property.property_number}: ${error.message}`);
    }
    
    // レート制限を考慮して1秒待機
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 再同期完了:');
  console.log(`  成功: ${success}件`);
  console.log(`  失敗: ${failed}件`);
}

backfillMissingPropertyAbout();
```

---

## 3. データフロー

### 3.1 同期処理のフロー

```
1. PropertyListingSyncService.syncUpdatedPropertyListings()
   ↓
2. スプレッドシートから物件データを取得
   ↓
3. データベースと比較して変更を検出
   ↓
4. 変更があった物件に対して:
   ├─ property_listingsテーブルを更新
   └─ updatePropertyDetailsFromSheets() ← ここを有効化
       ↓
       ├─ PropertyService.getPropertyAbout()
       ├─ RecommendedCommentService.getRecommendedComment()
       ├─ FavoriteCommentService.getFavoriteComment()
       └─ AthomeDataService.getAthomeData()
       ↓
       PropertyDetailsService.upsertPropertyDetails()
       ↓
       property_detailsテーブルに保存
```

### 3.2 エラーハンドリングのフロー

```
updatePropertyDetailsFromSheets()
  ↓
  try {
    並列データ取得
    ├─ PropertyService.getPropertyAbout() → エラー → null
    ├─ RecommendedCommentService → エラー → { comments: [] }
    ├─ FavoriteCommentService → エラー → { comment: null }
    └─ AthomeDataService → エラー → { data: [] }
    ↓
    PropertyDetailsService.upsertPropertyDetails()
    ↓
    成功 → ログに記録
  } catch (error) {
    エラーログに記録
    同期処理全体は継続
  }
```

---

## 4. テスト戦略

### 4.1 単体テスト

#### 4.1.1 `updatePropertyDetailsFromSheets()`のテスト

**テストケース**:
1. 正常系: すべてのデータが正しく取得・保存される
2. 異常系: PropertyServiceがエラーを返す → 他のデータは保存される
3. 異常系: RecommendedCommentServiceがエラーを返す → 他のデータは保存される
4. 異常系: すべてのサービスがエラーを返す → エラーログに記録される

**実装例**:
```typescript
describe('PropertyListingSyncService', () => {
  describe('updatePropertyDetailsFromSheets', () => {
    it('should update property details successfully', async () => {
      // テスト実装
    });
    
    it('should handle PropertyService error gracefully', async () => {
      // テスト実装
    });
    
    it('should handle RecommendedCommentService error gracefully', async () => {
      // テスト実装
    });
  });
});
```

### 4.2 統合テスト

#### 4.2.1 同期処理の統合テスト

**テストケース**:
1. 物件リストスプレッドシートを更新 → コメントデータが自動的に同期される
2. 新規物件追加 → コメントデータが正しく保存される
3. 既存物件更新 → コメントデータが正しく更新される

### 4.3 本番環境での検証

**検証項目**:
1. AA12608の`property_about`が正しく保存される
2. AA12608の公開物件サイトで「こちらの物件について」が表示される
3. 他の物件でもコメントデータが正しく表示される
4. 同期処理のパフォーマンスが許容範囲内である

---

## 5. パフォーマンス最適化

### 5.1 バッチ処理

**現在の設定**:
- バッチサイズ: 10件/バッチ
- バッチ間の待機時間: 1秒

**最適化案**:
- バッチサイズを動的に調整（エラー率に応じて）
- 並列処理の活用（Promise.all）

### 5.2 キャッシュの活用

**現在の実装**:
- RecommendedCommentService: 5分間キャッシュ
- FavoriteCommentService: 5分間キャッシュ

**最適化案**:
- キャッシュTTLを延長（10分間）
- キャッシュヒット率をモニタリング

---

## 6. モニタリングとログ

### 6.1 ログの改善

**追加するログ**:
1. 各サービスの実行時間
2. エラーの詳細（スタックトレース含む）
3. 成功/失敗の統計

**実装例**:
```typescript
console.log(`[PropertyListingSyncService] Starting updatePropertyDetailsFromSheets for ${propertyNumber}`);
const startTime = Date.now();

// ... 処理 ...

const duration = Date.now() - startTime;
console.log(`[PropertyListingSyncService] Completed updatePropertyDetailsFromSheets for ${propertyNumber} in ${duration}ms`);
```

### 6.2 エラーモニタリング

**エラーの分類**:
1. ネットワークエラー（Google Sheets API）
2. データベースエラー（Supabase）
3. データ不整合エラー（物件が見つからない）

**対応方法**:
- エラーログを`sync_logs`テーブルに記録
- エラー率が閾値を超えたらアラート

---

## 7. デプロイ計画

### 7.1 段階的デプロイ

**フェーズ1: 開発環境**
1. コードを修正
2. 単体テストを実施
3. 統合テストを実施

**フェーズ2: ステージング環境**
1. 既存物件の再同期スクリプトを実行
2. AA12608を含む複数の物件で検証
3. パフォーマンステスト

**フェーズ3: 本番環境**
1. 本番環境にデプロイ
2. 既存物件の再同期スクリプトを実行
3. モニタリング

### 7.2 ロールバック計画

**問題が発生した場合**:
1. `updatePropertyDetailsFromSheets()`を再度コメントアウト
2. 以前のバージョンにロールバック
3. 問題を調査して修正

---

## 8. 正確性プロパティ（Property-Based Testing）

### 8.1 プロパティ1: データの完全性

**プロパティ**: すべての物件に対して、`property_about`が空でない場合、`property_details`テーブルに保存されている

**検証方法**:
```typescript
// すべての物件を取得
const properties = await getAllProperties();

for (const property of properties) {
  const propertyAbout = await PropertyService.getPropertyAbout(property.property_number);
  
  if (propertyAbout) {
    const details = await PropertyDetailsService.getByPropertyNumber(property.property_number);
    assert(details.property_about === propertyAbout);
  }
}
```

### 8.2 プロパティ2: 同期の冪等性

**プロパティ**: 同じ物件に対して`updatePropertyDetailsFromSheets()`を複数回実行しても、結果は同じである

**検証方法**:
```typescript
const propertyNumber = 'AA12608';

// 1回目の実行
await syncService.updatePropertyDetailsFromSheets(propertyNumber);
const result1 = await PropertyDetailsService.getByPropertyNumber(propertyNumber);

// 2回目の実行
await syncService.updatePropertyDetailsFromSheets(propertyNumber);
const result2 = await PropertyDetailsService.getByPropertyNumber(propertyNumber);

// 結果が同じであることを確認
assert.deepEqual(result1, result2);
```

### 8.3 プロパティ3: エラーハンドリングの堅牢性

**プロパティ**: 一部のサービスがエラーを返しても、他のデータは正しく保存される

**検証方法**:
```typescript
// PropertyServiceをモックしてエラーを返す
jest.spyOn(PropertyService.prototype, 'getPropertyAbout').mockRejectedValue(new Error('Test error'));

await syncService.updatePropertyDetailsFromSheets('AA12608');

const details = await PropertyDetailsService.getByPropertyNumber('AA12608');

// property_aboutは空だが、他のデータは保存されている
assert(details.property_about === null);
assert(details.recommended_comments.length > 0);
assert(details.favorite_comment !== null);
```

---

## 9. まとめ

### 9.1 実装の優先順位

1. **高優先度**: `updatePropertyDetailsFromSheets()`のコメントアウトを解除
2. **高優先度**: エラーハンドリングの改善
3. **中優先度**: 既存物件の再同期スクリプトの作成
4. **低優先度**: パフォーマンス最適化

### 9.2 期待される効果

- ✅ すべての物件でコメントデータが正しく表示される
- ✅ 同期処理が自動的に実行される
- ✅ エラーが発生しても同期処理全体が停止しない
- ✅ エラーログが詳細で、問題の特定が容易

### 9.3 次のステップ

1. タスクリストの作成
2. 実装の開始
3. テストの実施
4. デプロイ
